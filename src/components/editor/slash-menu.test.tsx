// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SLASH_OPTIONS, SlashMenu, filterSlashOptions } from "@/components/editor/slash-menu";

describe("slash menu", () => {
  it("filters by label, type and keyword", () => {
    expect(filterSlashOptions("").length).toBe(SLASH_OPTIONS.length);
    expect(filterSlashOptions("head").map((o) => o.type)).toEqual(["heading1", "heading2"]);
    expect(filterSlashOptions("h2").map((o) => o.type)).toEqual(["heading2"]);
    expect(filterSlashOptions("checkbox").map((o) => o.type)).toEqual(["todo"]);
    expect(filterSlashOptions("zzz")).toEqual([]);
  });

  it("renders a listbox with the active option marked and selects on click", async () => {
    const onSelect = vi.fn();
    render(
      <SlashMenu id="m" options={filterSlashOptions("list")} activeIndex={1} onHover={() => {}} onSelect={onSelect} />
    );
    const options = screen.getAllByRole("option");
    expect(screen.getByRole("listbox", { name: "Block types" })).toBeInTheDocument();
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual(["false", "true"]);
    await userEvent.setup().click(options[1]);
    expect(onSelect).toHaveBeenCalledWith("numbered");
  });

  it("explains an empty result instead of rendering an empty box", () => {
    render(<SlashMenu id="m" options={[]} activeIndex={0} onHover={() => {}} onSelect={() => {}} />);
    expect(screen.getByText(/No blocks match/)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
