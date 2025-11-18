// api/items.js

const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_SECRET });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!DATABASE_ID || !process.env.NOTION_SECRET) {
    return res
      .status(500)
      .json({ error: "Server missing Notion configuration" });
  }

  // Read category from query string, default to "Sides"
  const category = (req.query && req.query.category) || "Sides";

  try {
    const pages = [];
    let cursor;

    do {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        start_cursor: cursor,
        filter: {
          property: "Type",
          multi_select: {
            contains: category
          }
        }
      });

      pages.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const items = pages.map(page => {
      const prop = page.properties["Activity Name"];
      let label = "Untitled";

      if (prop && prop.type === "title" && prop.title.length > 0) {
        const text = prop.title[0].plain_text;
        if (text && text.trim().length > 0) {
          label = text.trim();
        }
      }

      return {
        id: page.id,
        label
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("Error fetching Notion items:", err);
    return res.status(500).json({ error: "Failed to fetch items from Notion" });
  }
};
