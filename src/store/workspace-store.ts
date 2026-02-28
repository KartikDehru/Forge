"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  ActivityEvent,
  ActivityMeta,
  ActivityType,
  Comment,
  DocumentBlock,
  DocumentPage,
  Issue,
  IssueStatus,
  User,
  Workspace,
  WorkspaceRole,
} from "@/types";
import {
  appendActivity,
  applyIssuePatch,
  applyTransition,
  authorize,
  buildIssue,
  createActivityEvent,
  createBlock,
  deriveInvitee,
  domainError,
  err,
  extractMentionedUserIds,
  ok,
  recordPageEdit,
  roleOf,
  validateInvite,
  validateRemoval,
  validateRoleChange,
  validateWorkspaceName,
  slugify,
  type DomainError,
  type IssuePatch,
  type NewIssueInput,
  type Permission,
  type Result,
} from "@/domain";
import { STORE_KEY, STORE_VERSION } from "@/lib/constants";
import {
  createSafeStorage,
  migratePersistedState,
  type PersistedWorkspaceState,
} from "@/lib/persistence";
import { createSeedState } from "@/lib/seed-data";

export type ActionResult<T> = Result<T, DomainError>;

interface WorkspaceState extends PersistedWorkspaceState {
  setActiveWorkspace: (id: string) => void;
  setActiveProject: (id: string) => void;

  createIssue: (actorId: string, input: NewIssueInput) => ActionResult<Issue>;
  updateIssue: (actorId: string, issueId: string, patch: IssuePatch) => ActionResult<Issue>;
  transitionIssue: (actorId: string, issueId: string, to: IssueStatus) => ActionResult<Issue>;
  deleteIssue: (actorId: string, issueId: string) => ActionResult<Issue>;

  addComment: (
    actorId: string,
    entityType: Comment["entityType"],
    entityId: string,
    body: string
  ) => ActionResult<Comment>;

  createPage: (actorId: string, input: { projectId: string; title: string }) => ActionResult<DocumentPage>;
  renamePage: (actorId: string, pageId: string, title: string) => ActionResult<DocumentPage>;
  savePageBlocks: (
    actorId: string,
    pageId: string,
    blocks: DocumentBlock[],
    options?: { recordActivity?: boolean }
  ) => ActionResult<DocumentPage>;
  deletePage: (actorId: string, pageId: string) => ActionResult<DocumentPage>;

  renameWorkspace: (actorId: string, workspaceId: string, name: string) => ActionResult<Workspace>;
  inviteMember: (
    actorId: string,
    workspaceId: string,
    input: { email: string; role: WorkspaceRole }
  ) => ActionResult<User>;
  changeMemberRole: (
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    role: WorkspaceRole
  ) => ActionResult<Workspace>;
  removeMember: (actorId: string, workspaceId: string, targetUserId: string) => ActionResult<Workspace>;

  markNotificationsRead: (userId: string) => void;
  resetData: (actorId: string) => ActionResult<true>;
}

const nowIso = () => new Date().toISOString();

const notFound = (what: string): DomainError =>
  domainError("NOT_FOUND", `${what} no longer exists.`);

function validateText(
  raw: string,
  field: string,
  label: string,
  max: number
): Result<string, DomainError> {
  const value = raw.trim();
  if (!value) return err(domainError("VALIDATION", `${label} can't be empty.`, field));
  if (value.length > max) {
    return err(domainError("VALIDATION", `${label} must be ${max} characters or fewer.`, field));
  }
  return ok(value);
}

function dataOnly(state: WorkspaceState): PersistedWorkspaceState {
  return {
    users: state.users,
    workspaces: state.workspaces,
    projects: state.projects,
    pages: state.pages,
    issues: state.issues,
    labels: state.labels,
    comments: state.comments,
    activity: state.activity,
    notificationsReadAt: state.notificationsReadAt,
    activeWorkspaceId: state.activeWorkspaceId,
    activeProjectId: state.activeProjectId,
  };
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => {
      const roleFor = (workspaceId: string, userId: string): WorkspaceRole | null => {
        const ws = get().workspaces.find((w) => w.id === workspaceId);
        return ws ? roleOf(ws, userId) : null;
      };

      const guard = (
        workspaceId: string,
        actorId: string,
        permission: Permission
      ): Result<true, DomainError> => authorize(roleFor(workspaceId, actorId), permission);

      const event = (
        type: ActivityType,
        actorId: string,
        workspaceId: string,
        entityType: ActivityEvent["entityType"],
        entityId: string,
        entityTitle: string,
        meta: ActivityMeta = {}
      ): ActivityEvent =>
        createActivityEvent({
          id: nanoid(10),
          workspaceId,
          type,
          actorId,
          entityType,
          entityId,
          entityTitle,
          meta,
          now: nowIso(),
        });

      const issueMeta = (issue: Issue, extra: ActivityMeta = {}): ActivityMeta => ({
        identifier: issue.identifier,
        projectId: issue.projectId,
        assigneeId: issue.assigneeId,
        ...extra,
      });

      return {
        ...createSeedState(),

        setActiveWorkspace: (id) => {
          const state = get();
          if (state.activeWorkspaceId === id) return;
          const project = state.projects.find((p) => p.workspaceId === id);
          set({ activeWorkspaceId: id, activeProjectId: project?.id ?? "" });
        },

        setActiveProject: (id) => {
          const state = get();
          if (state.activeProjectId === id) return;
          const project = state.projects.find((p) => p.id === id);
          if (!project) return;
          set({ activeProjectId: id, activeWorkspaceId: project.workspaceId });
        },

        // -- issues ---------------------------------------------------------

        createIssue: (actorId, input) => {
          const state = get();
          const project = state.projects.find((p) => p.id === input.projectId);
          if (!project) return err(notFound("Project"));
          const workspace = state.workspaces.find((w) => w.id === project.workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspace.id, actorId, "issue.create");
          if (!allowed.ok) return allowed;

          const built = buildIssue(input, {
            workspaceId: workspace.id,
            project,
            memberIds: workspace.members.map((m) => m.userId),
            labelIds: state.labels.filter((l) => l.workspaceId === workspace.id).map((l) => l.id),
            existingIssues: state.issues,
            actorId,
            now: nowIso(),
            id: nanoid(10),
          });
          if (!built.ok) return built;
          const issue = built.value;

          let activity = appendActivity(
            state.activity,
            event("issue.created", actorId, workspace.id, "issue", issue.id, issue.title, issueMeta(issue))
          );
          if (issue.assigneeId && issue.assigneeId !== actorId) {
            activity = appendActivity(
              activity,
              event("issue.assigned", actorId, workspace.id, "issue", issue.id, issue.title, issueMeta(issue))
            );
          }
          set({ issues: [...state.issues, issue], activity });
          return ok(issue);
        },

        updateIssue: (actorId, issueId, patch) => {
          const state = get();
          const issue = state.issues.find((i) => i.id === issueId);
          if (!issue) return err(notFound("Issue"));
          const workspace = state.workspaces.find((w) => w.id === issue.workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(issue.workspaceId, actorId, "issue.update");
          if (!allowed.ok) return allowed;

          const next = applyIssuePatch(issue, patch, {
            memberIds: workspace.members.map((m) => m.userId),
            labelIds: state.labels.filter((l) => l.workspaceId === workspace.id).map((l) => l.id),
            now: nowIso(),
          });
          if (!next.ok) return next;

          let activity = state.activity;
          if (next.value.assigneeId !== issue.assigneeId) {
            activity = appendActivity(
              activity,
              event("issue.assigned", actorId, workspace.id, "issue", issue.id, next.value.title, issueMeta(next.value))
            );
          }
          set({
            issues: state.issues.map((i) => (i.id === issueId ? next.value : i)),
            activity,
          });
          return ok(next.value);
        },

        transitionIssue: (actorId, issueId, to) => {
          const state = get();
          const issue = state.issues.find((i) => i.id === issueId);
          if (!issue) return err(notFound("Issue"));
          const allowed = guard(issue.workspaceId, actorId, "issue.transition");
          if (!allowed.ok) return allowed;
          const next = applyTransition(issue, to, nowIso());
          if (!next.ok) return next;

          set({
            issues: state.issues.map((i) => (i.id === issueId ? next.value : i)),
            activity: appendActivity(
              state.activity,
              event(
                "issue.status_changed",
                actorId,
                issue.workspaceId,
                "issue",
                issue.id,
                issue.title,
                issueMeta(issue, { from: issue.status, to })
              )
            ),
          });
          return ok(next.value);
        },

        deleteIssue: (actorId, issueId) => {
          const state = get();
          const issue = state.issues.find((i) => i.id === issueId);
          if (!issue) return err(notFound("Issue"));
          const allowed = guard(issue.workspaceId, actorId, "issue.delete");
          if (!allowed.ok) return allowed;
          set({
            issues: state.issues.filter((i) => i.id !== issueId),
            comments: state.comments.filter(
              (c) => !(c.entityType === "issue" && c.entityId === issueId)
            ),
            activity: appendActivity(
              state.activity,
              event("issue.deleted", actorId, issue.workspaceId, "issue", issue.id, issue.title, {
                identifier: issue.identifier,
                projectId: issue.projectId,
              })
            ),
          });
          return ok(issue);
        },

        // -- comments -------------------------------------------------------

        addComment: (actorId, entityType, entityId, body) => {
          const state = get();
          const issue =
            entityType === "issue" ? state.issues.find((i) => i.id === entityId) : undefined;
          const page =
            entityType === "page" ? state.pages.find((p) => p.id === entityId) : undefined;
          const target = issue ?? page;
          if (!target) return err(notFound(entityType === "issue" ? "Issue" : "Page"));
          const workspace = state.workspaces.find((w) => w.id === target.workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspace.id, actorId, "comment.add");
          if (!allowed.ok) return allowed;
          const text = validateText(body, "body", "Comment", 4000);
          if (!text.ok) return text;

          const memberUsers = state.users.filter((u) =>
            workspace.members.some((m) => m.userId === u.id)
          );
          const mentions = extractMentionedUserIds(text.value, memberUsers);
          const timestamp = nowIso();
          const comment: Comment = {
            id: nanoid(10),
            workspaceId: workspace.id,
            entityType,
            entityId,
            authorId: actorId,
            body: text.value,
            mentions,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          set({
            comments: [...state.comments, comment],
            issues: issue
              ? state.issues.map((i) =>
                  i.id === issue.id
                    ? { ...i, commentCount: i.commentCount + 1, updatedAt: timestamp }
                    : i
                )
              : state.issues,
            activity: appendActivity(
              state.activity,
              event(
                "comment.added",
                actorId,
                workspace.id,
                entityType,
                entityId,
                target.title,
                issue ? issueMeta(issue, { mentions }) : { mentions }
              )
            ),
          });
          return ok(comment);
        },

        // -- pages ----------------------------------------------------------

        createPage: (actorId, input) => {
          const state = get();
          const project = state.projects.find((p) => p.id === input.projectId);
          if (!project) return err(notFound("Project"));
          const allowed = guard(project.workspaceId, actorId, "page.create");
          if (!allowed.ok) return allowed;
          const title = validateText(input.title || "Untitled", "title", "Title", 120);
          if (!title.ok) return title;
          const timestamp = nowIso();
          const page: DocumentPage = {
            id: nanoid(10),
            projectId: project.id,
            workspaceId: project.workspaceId,
            title: title.value,
            blocks: [createBlock(nanoid(8))],
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: actorId,
          };
          set({
            pages: [...state.pages, page],
            activity: appendActivity(
              state.activity,
              event("page.created", actorId, page.workspaceId, "page", page.id, page.title, {
                projectId: project.id,
              })
            ),
          });
          return ok(page);
        },

        renamePage: (actorId, pageId, rawTitle) => {
          const state = get();
          const page = state.pages.find((p) => p.id === pageId);
          if (!page) return err(notFound("Page"));
          const allowed = guard(page.workspaceId, actorId, "page.edit");
          if (!allowed.ok) return allowed;
          const title = validateText(rawTitle, "title", "Title", 120);
          if (!title.ok) return title;
          const next = { ...page, title: title.value, updatedAt: nowIso(), updatedBy: actorId };
          set({
            pages: state.pages.map((p) => (p.id === pageId ? next : p)),
            activity: recordPageEdit(
              state.activity,
              event("page.edited", actorId, page.workspaceId, "page", page.id, next.title, {
                projectId: page.projectId,
              })
            ),
          });
          return ok(next);
        },

        savePageBlocks: (actorId, pageId, blocks, options = {}) => {
          const state = get();
          const page = state.pages.find((p) => p.id === pageId);
          if (!page) return err(notFound("Page"));
          const allowed = guard(page.workspaceId, actorId, "page.edit");
          if (!allowed.ok) return allowed;
          const next: DocumentPage = {
            ...page,
            blocks,
            updatedAt: nowIso(),
            updatedBy: options.recordActivity ? actorId : page.updatedBy,
          };
          set({
            pages: state.pages.map((p) => (p.id === pageId ? next : p)),
            activity: options.recordActivity
              ? recordPageEdit(
                  state.activity,
                  event("page.edited", actorId, page.workspaceId, "page", page.id, page.title, {
                    projectId: page.projectId,
                  })
                )
              : state.activity,
          });
          return ok(next);
        },

        deletePage: (actorId, pageId) => {
          const state = get();
          const page = state.pages.find((p) => p.id === pageId);
          if (!page) return err(notFound("Page"));
          const allowed = guard(page.workspaceId, actorId, "page.delete");
          if (!allowed.ok) return allowed;
          set({
            pages: state.pages.filter((p) => p.id !== pageId),
            comments: state.comments.filter(
              (c) => !(c.entityType === "page" && c.entityId === pageId)
            ),
          });
          return ok(page);
        },

        // -- workspace ------------------------------------------------------

        renameWorkspace: (actorId, workspaceId, rawName) => {
          const state = get();
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspaceId, actorId, "settings.update");
          if (!allowed.ok) return allowed;
          const name = validateWorkspaceName(rawName);
          if (!name.ok) return name;
          const next = { ...workspace, name: name.value, slug: slugify(name.value) };
          set({ workspaces: state.workspaces.map((w) => (w.id === workspaceId ? next : w)) });
          return ok(next);
        },

        inviteMember: (actorId, workspaceId, input) => {
          const state = get();
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspaceId, actorId, "member.invite");
          if (!allowed.ok) return allowed;
          const check = validateInvite(input, {
            actorRole: roleFor(workspaceId, actorId),
            workspace,
            users: state.users,
          });
          if (!check.ok) return check;

          let user = state.users.find((u) => u.id === check.value.existingUserId);
          let users = state.users;
          if (!user) {
            const derived = deriveInvitee(check.value.email);
            user = { id: nanoid(8), email: check.value.email, ...derived };
            users = [...users, user];
          }
          const nextWorkspace: Workspace = {
            ...workspace,
            members: [
              ...workspace.members,
              { userId: user.id, role: check.value.role, joinedAt: nowIso() },
            ],
          };
          set({
            users,
            workspaces: state.workspaces.map((w) => (w.id === workspaceId ? nextWorkspace : w)),
            activity: appendActivity(
              state.activity,
              event("member.invited", actorId, workspaceId, "workspace", user.id, user.name, {
                role: check.value.role,
              })
            ),
          });
          return ok(user);
        },

        changeMemberRole: (actorId, workspaceId, targetUserId, role) => {
          const state = get();
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspaceId, actorId, "member.change_role");
          if (!allowed.ok) return allowed;
          const checked = validateRoleChange(
            { targetUserId, role },
            { actorRole: roleFor(workspaceId, actorId), workspace }
          );
          if (!checked.ok) return checked;
          const next: Workspace = {
            ...workspace,
            members: workspace.members.map((m) => (m.userId === targetUserId ? { ...m, role } : m)),
          };
          set({ workspaces: state.workspaces.map((w) => (w.id === workspaceId ? next : w)) });
          return ok(next);
        },

        removeMember: (actorId, workspaceId, targetUserId) => {
          const state = get();
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          if (!workspace) return err(notFound("Workspace"));
          const allowed = guard(workspaceId, actorId, "member.remove");
          if (!allowed.ok) return allowed;
          const checked = validateRemoval(
            { targetUserId },
            { actorRole: roleFor(workspaceId, actorId), workspace }
          );
          if (!checked.ok) return checked;
          const next: Workspace = {
            ...workspace,
            members: workspace.members.filter((m) => m.userId !== targetUserId),
          };
          set({
            workspaces: state.workspaces.map((w) => (w.id === workspaceId ? next : w)),
            issues: state.issues.map((i) =>
              i.workspaceId === workspaceId && i.assigneeId === targetUserId
                ? { ...i, assigneeId: null, status: i.status === "in_progress" || i.status === "in_review" ? "todo" : i.status }
                : i
            ),
          });
          return ok(next);
        },

        markNotificationsRead: (userId) =>
          set((s) => ({ notificationsReadAt: { ...s.notificationsReadAt, [userId]: nowIso() } })),

        resetData: (actorId) => {
          const allowed = guard(get().activeWorkspaceId, actorId, "workspace.reset");
          if (!allowed.ok) return allowed;
          set(createSeedState());
          return ok(true);
        },
      };
    },
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createSafeStorage<PersistedWorkspaceState>(),
      skipHydration: true,
      partialize: (state) => dataOnly(state),
      migrate: (persisted, version) => migratePersistedState(persisted, version),
    }
  )
);
