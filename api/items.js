const response = await notion.databases.query({
  database_id: DATABASE_ID,
  start_cursor: cursor,
  filter: {
    property: "Type",
    multi_select: {
      contains: "Sides"
    }
  }
});
