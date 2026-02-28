import { describe, expect, it } from "vitest";
import type { DocumentBlock } from "@/types";
import {
  buildTree,
  changeBlockType,
  createBlock,
  deleteBlock,
  flattenTree,
  indentBlock,
  insertBlockAfter,
  mergeWithPrevious,
  moveBlock,
  normalizeBlocks,
  numberingFor,
  outdentBlock,
  reorderBlock,
  splitBlock,
} from "./blocks";
import type { BlockResult } from "./blocks";

function doc(spec: [string, number, string?, DocumentBlock["type"]?][]): DocumentBlock[] {
  return normalizeBlocks(
    spec.map(([id, depth, content = id, type = "paragraph"], order) => ({
      ...createBlock(id, type, content, depth),
      order,
    }))
  );
}

const shape = (blocks: DocumentBlock[]) => blocks.map((b) => `${"-".repeat(b.depth)}${b.id}`);

function unwrap(result: BlockResult) {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

describe("normalizeBlocks", () => {
  it("reindexes order and clamps impossible depth", () => {
    const messy = [
      { ...createBlock("a", "paragraph", "", 3), order: 9 },
      { ...createBlock("b", "paragraph", "", 5), order: 12 },
    ];
    const result = normalizeBlocks(messy);
    expect(result.map((b) => [b.order, b.depth])).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});

describe("insert and delete", () => {
  it("inserts after a block's whole subtree as a sibling", () => {
    const blocks = doc([["a", 0], ["b", 1], ["c", 0]]);
    const edit = unwrap(insertBlockAfter(blocks, "a", createBlock("n")));
    expect(shape(edit.blocks)).toEqual(["a", "-b", "n", "c"]);
    expect(edit.focusId).toBe("n");
  });

  it("deletes with cascade or promotes children", () => {
    const blocks = doc([["a", 0], ["b", 1], ["c", 1], ["d", 0]]);
    expect(shape(unwrap(deleteBlock(blocks, "a", "cascade")).blocks)).toEqual(["d"]);
    expect(shape(unwrap(deleteBlock(blocks, "a", "promote")).blocks)).toEqual(["b", "c", "d"]);
  });

  it("never leaves the document empty", () => {
    const edit = unwrap(deleteBlock(doc([["only", 0]]), "only"));
    expect(edit.blocks).toHaveLength(1);
    expect(edit.blocks[0].content).toBe("");
  });

  it("reports missing blocks with a typed error", () => {
    expect(deleteBlock(doc([["a", 0]]), "zzz")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("indent and outdent", () => {
  it("indents under the previous block, subtree included", () => {
    const blocks = doc([["a", 0], ["b", 0], ["c", 1]]);
    expect(shape(unwrap(indentBlock(blocks, "b")).blocks)).toEqual(["a", "-b", "--c"]);
  });

  it("refuses to indent the first block or beyond the previous block", () => {
    const blocks = doc([["a", 0], ["b", 1]]);
    expect(indentBlock(blocks, "a")).toMatchObject({ ok: false, error: { code: "BLOCK_BOUNDARY" } });
    expect(indentBlock(blocks, "b")).toMatchObject({ ok: false, error: { code: "BLOCK_DEPTH" } });
  });

  it("outdents and refuses at the top level", () => {
    const blocks = doc([["a", 0], ["b", 1]]);
    expect(shape(unwrap(outdentBlock(blocks, "b")).blocks)).toEqual(["a", "b"]);
    expect(outdentBlock(blocks, "a")).toMatchObject({ ok: false, error: { code: "BLOCK_DEPTH" } });
  });
});

describe("move and reorder", () => {
  it("moves a block with its children past a sibling", () => {
    const blocks = doc([["a", 0], ["b", 0], ["c", 1], ["d", 0]]);
    expect(shape(unwrap(moveBlock(blocks, "b", "up")).blocks)).toEqual(["b", "-c", "a", "d"]);
    expect(shape(unwrap(moveBlock(blocks, "a", "down")).blocks)).toEqual(["b", "-c", "a", "d"]);
  });

  it("stops at sibling boundaries", () => {
    const blocks = doc([["a", 0], ["b", 1], ["c", 0]]);
    expect(moveBlock(blocks, "a", "up")).toMatchObject({ ok: false, error: { code: "BLOCK_BOUNDARY" } });
    expect(moveBlock(blocks, "b", "down")).toMatchObject({ ok: false, error: { code: "BLOCK_BOUNDARY" } });
  });

  it("reorders by drag target and adopts the target depth", () => {
    const blocks = doc([["a", 0], ["b", 1], ["c", 0], ["d", 0]]);
    expect(shape(unwrap(reorderBlock(blocks, "d", "b", "before")).blocks)).toEqual(["a", "-d", "-b", "c"]);
    expect(shape(unwrap(reorderBlock(blocks, "a", "c", "after")).blocks)).toEqual(["c", "a", "-b", "d"]);
  });

  it("rejects dropping a block into its own subtree", () => {
    const blocks = doc([["a", 0], ["b", 1]]);
    expect(reorderBlock(blocks, "a", "b", "after")).toMatchObject({
      ok: false,
      error: { code: "BLOCK_CYCLE" },
    });
  });
});

describe("split (Enter)", () => {
  it("splits text at the caret and focuses the new block", () => {
    const blocks = doc([["a", 0, "hello world"]]);
    const edit = unwrap(splitBlock(blocks, "a", 5, "n"));
    expect(edit.blocks.map((b) => b.content)).toEqual(["hello", " world"]);
    expect(edit.focusId).toBe("n");
    expect(edit.caret).toBe(0);
  });

  it("continues list types but not headings", () => {
    const list = doc([["a", 0, "item", "bullet"]]);
    expect(unwrap(splitBlock(list, "a", 4, "n")).blocks[1].type).toBe("bullet");
    const heading = doc([["h", 0, "Title", "heading1"]]);
    expect(unwrap(splitBlock(heading, "h", 5, "n")).blocks[1].type).toBe("paragraph");
  });

  it("outdents then un-lists an empty list item", () => {
    const nested = doc([["a", 0, "x", "bullet"], ["b", 1, "", "bullet"]]);
    const outdented = unwrap(splitBlock(nested, "b", 0, "n"));
    expect(shape(outdented.blocks)).toEqual(["a", "b"]);
    const flat = unwrap(splitBlock(outdented.blocks, "b", 0, "n"));
    expect(flat.blocks[1].type).toBe("paragraph");
  });

  it("inserts the new block as first child when the block has children", () => {
    const blocks = doc([["a", 0, "parent"], ["b", 1, "child"]]);
    const edit = unwrap(splitBlock(blocks, "a", 6, "n"));
    expect(shape(edit.blocks)).toEqual(["a", "-n", "-b"]);
  });

  it("opens a blank block above when Enter is pressed at the start", () => {
    const edit = unwrap(splitBlock(doc([["a", 0, "text"]]), "a", 0, "n"));
    expect(shape(edit.blocks)).toEqual(["n", "a"]);
    expect(edit.focusId).toBe("a");
  });
});

describe("merge (Backspace)", () => {
  it("merges into the previous block and places the caret at the seam", () => {
    const edit = unwrap(mergeWithPrevious(doc([["a", 0, "foo"], ["b", 0, "bar"]]), "b"));
    expect(edit.blocks).toHaveLength(1);
    expect(edit.blocks[0].content).toBe("foobar");
    expect(edit.focusId).toBe("a");
    expect(edit.caret).toBe(3);
  });

  it("downgrades formatted blocks to paragraphs before merging", () => {
    const edit = unwrap(mergeWithPrevious(doc([["a", 0, "x"], ["b", 0, "y", "bullet"]]), "b"));
    expect(edit.blocks[1].type).toBe("paragraph");
    expect(edit.blocks).toHaveLength(2);
  });

  it("removes a divider instead of merging into it, and stops at the top", () => {
    const withDivider = doc([["d", 0, "", "divider"], ["b", 0, "text"]]);
    expect(shape(unwrap(mergeWithPrevious(withDivider, "b")).blocks)).toEqual(["b"]);
    expect(mergeWithPrevious(doc([["a", 0]]), "a")).toMatchObject({
      ok: false,
      error: { code: "BLOCK_BOUNDARY" },
    });
  });
});

describe("tree and numbering", () => {
  it("round-trips flat blocks through a tree", () => {
    const blocks = doc([["a", 0], ["b", 1], ["c", 2], ["d", 1], ["e", 0]]);
    const tree = buildTree(blocks);
    expect(tree).toHaveLength(2);
    expect(tree[0].children.map((n) => n.block.id)).toEqual(["b", "d"]);
    expect(flattenTree(tree)).toEqual(blocks);
  });

  it("numbers consecutive items per depth and restarts after interruptions", () => {
    const blocks = doc([
      ["a", 0, "", "numbered"],
      ["b", 1, "", "numbered"],
      ["c", 1, "", "numbered"],
      ["d", 0, "", "numbered"],
      ["p", 0, "", "paragraph"],
      ["e", 0, "", "numbered"],
    ]);
    const n = numberingFor(blocks);
    expect([a(n, "a"), a(n, "b"), a(n, "c"), a(n, "d"), a(n, "e")]).toEqual([1, 1, 2, 2, 1]);
  });

  it("clears the checked flag when leaving to-do", () => {
    const blocks = doc([["t", 0, "x", "todo"]]);
    const edit = unwrap(changeBlockType(blocks, "t", "bullet"));
    expect(edit.blocks[0]).not.toHaveProperty("checked");
  });
});

function a(map: Map<string, number>, id: string) {
  return map.get(id);
}
