#!/usr/bin/env python3
"""Regression tests for newsletter-to-blog parsing.

    python3 scripts/test-newsletter-to-blog.py
"""
import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
spec = importlib.util.spec_from_file_location(
    "newsletter_to_blog", ROOT / "_tools" / "newsletter-to-blog.py")
newsletter = importlib.util.module_from_spec(spec)
sys.modules["newsletter_to_blog"] = newsletter
spec.loader.exec_module(newsletter)


def campaign_with_archive_callout():
    cards = "".join(
        f"""
        <table class="bg-callout">
          <tr><td>
            <h2 class="card-h">{tool} feature {i}</h2>
            <p>A description of the feature.</p>
            <p>1. Open the app.</p>
            <div class="t-faint"><a href="https://example.com/{tool.lower()}">Source</a></div>
          </td></tr>
        </table>
        """
        for i, tool in enumerate(newsletter.TOOLS, 1)
    )
    return {
        "name": "Darice on AI - Test issue - 2026-10-19",
        "scheduled_for": "2026-10-19",
        "emails": [{
            "content": f"""
            <h1>Test issue</h1>
            <td class="intro"><p>An introduction.</p></td>
            <table class="bg-callout">
              <tr><td>
                <div class="t-accent">Past issues</div>
                <a href="https://example.com/archive">See the full archive</a>
              </td></tr>
            </table>
            {cards}
            """
        }],
    }


def main():
    issue = newsletter.parse_issue(campaign_with_archive_callout())
    assert len(issue["sections"]) == 4
    assert [section["tool"] for section in issue["sections"]] == newsletter.TOOLS
    assert [section["feature"] for section in issue["sections"]] == [
        f"{tool} feature {i}" for i, tool in enumerate(newsletter.TOOLS, 1)
    ]
    assert all(section["steps"] == ["Open the app."] for section in issue["sections"])
    print("newsletter-to-blog parsing regression test passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
