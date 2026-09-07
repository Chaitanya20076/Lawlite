const { Client } = require("@notionhq/client");

const {
  refreshNotionAccessToken,
} = require("../config/notionOAuth");


/*
|--------------------------------------------------------------------------
| CREATE NOTION CLIENT
|--------------------------------------------------------------------------
*/

const createNotionClient = (
  accessToken
) => {
  if (!accessToken) {
    throw new Error(
      "Notion access token is missing."
    );
  }

  return new Client({
    auth:
      accessToken,
  });
};


/*
|--------------------------------------------------------------------------
| TEXT HELPERS
|--------------------------------------------------------------------------
*/

const normalizeText = (
  text = ""
) => {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
};


const richTextToPlainText = (
  richText = []
) => {
  return richText
    .map(
      (item) =>
        item?.plain_text ||
        item?.text?.content ||
        ""
    )
    .join("");
};


/*
|--------------------------------------------------------------------------
| BLOCK → TEXT
|--------------------------------------------------------------------------
*/

const blockToText = (
  block
) => {
  if (!block) {
    return "";
  }


  const type =
    block.type;


  /*
  |--------------------------------------------------------------------------
  | PARAGRAPH
  |--------------------------------------------------------------------------
  */

  if (
    type === "paragraph"
  ) {
    return richTextToPlainText(
      block.paragraph?.rich_text ||
        []
    );
  }


  /*
  |--------------------------------------------------------------------------
  | HEADINGS
  |--------------------------------------------------------------------------
  */

  if (
    type === "heading_1"
  ) {
    return `# ${richTextToPlainText(
      block.heading_1?.rich_text ||
        []
    )}`;
  }


  if (
    type === "heading_2"
  ) {
    return `## ${richTextToPlainText(
      block.heading_2?.rich_text ||
        []
    )}`;
  }


  if (
    type === "heading_3"
  ) {
    return `### ${richTextToPlainText(
      block.heading_3?.rich_text ||
        []
    )}`;
  }


  /*
  |--------------------------------------------------------------------------
  | BULLETED LIST
  |--------------------------------------------------------------------------
  */

  if (
    type === "bulleted_list_item"
  ) {
    return `- ${richTextToPlainText(
      block.bulleted_list_item
        ?.rich_text ||
        []
    )}`;
  }


  /*
  |--------------------------------------------------------------------------
  | NUMBERED LIST
  |--------------------------------------------------------------------------
  */

  if (
    type === "numbered_list_item"
  ) {
    return `- ${richTextToPlainText(
      block.numbered_list_item
        ?.rich_text ||
        []
    )}`;
  }


  /*
  |--------------------------------------------------------------------------
  | TO-DO
  |--------------------------------------------------------------------------
  */

  if (
    type === "to_do"
  ) {
    const checked =
      block.to_do?.checked
        ? "[x]"
        : "[ ]";

    return `${checked} ${richTextToPlainText(
      block.to_do?.rich_text ||
        []
    )}`;
  }


  /*
  |--------------------------------------------------------------------------
  | TOGGLE
  |--------------------------------------------------------------------------
  */

  if (
    type === "toggle"
  ) {
    return richTextToPlainText(
      block.toggle?.rich_text ||
        []
    );
  }


  /*
  |--------------------------------------------------------------------------
  | QUOTE
  |--------------------------------------------------------------------------
  */

  if (
    type === "quote"
  ) {
    return `> ${richTextToPlainText(
      block.quote?.rich_text ||
        []
    )}`;
  }


  /*
  |--------------------------------------------------------------------------
  | CALLOUT
  |--------------------------------------------------------------------------
  */

  if (
    type === "callout"
  ) {
    return richTextToPlainText(
      block.callout?.rich_text ||
        []
    );
  }


  /*
  |--------------------------------------------------------------------------
  | CODE
  |--------------------------------------------------------------------------
  */

  if (
    type === "code"
  ) {
    return richTextToPlainText(
      block.code?.rich_text ||
        []
    );
  }


  /*
  |--------------------------------------------------------------------------
  | DIVIDER
  |--------------------------------------------------------------------------
  */

  if (
    type === "divider"
  ) {
    return "---";
  }


  /*
  |--------------------------------------------------------------------------
  | TABLE OF CONTENTS
  |--------------------------------------------------------------------------
  */

  if (
    type === "table_of_contents"
  ) {
    return "";
  }


  /*
  |--------------------------------------------------------------------------
  | IMAGE / FILE / VIDEO
  |--------------------------------------------------------------------------
  |
  | We do not attempt OCR or media understanding here.
  |
  */

  if (
    type === "image" ||
    type === "file" ||
    type === "video"
  ) {
    return "";
  }


  return "";
};


/*
|--------------------------------------------------------------------------
| GET ALL BLOCK CHILDREN
|--------------------------------------------------------------------------
|
| Notion paginates block children.
|
|--------------------------------------------------------------------------
*/

const listAllBlockChildren =
  async (
    notion,
    blockId
  ) => {
    const blocks = [];

    let cursor =
      undefined;


    do {
      const response =
        await notion.blocks.children.list(
          {
            block_id:
              blockId,

            start_cursor:
              cursor,
          }
        );


      blocks.push(
        ...(response?.results || [])
      );


      cursor =
        response?.has_more
          ? response?.next_cursor
          : null;

    } while (
      cursor
    );


    return blocks;
  };


/*
|--------------------------------------------------------------------------
| EXTRACT PAGE TITLE
|--------------------------------------------------------------------------
*/

const getPageTitle = (
  page
) => {
  if (!page) {
    return "Untitled";
  }


  /*
  |--------------------------------------------------------------------------
  | NORMAL PAGE TITLE
  |--------------------------------------------------------------------------
  */

  const titleProperty =
    page.properties
      ? Object.values(
          page.properties
        ).find(
          (property) =>
            property?.type ===
            "title"
        )
      : null;


  if (
    titleProperty?.title
  ) {
    const title =
      richTextToPlainText(
        titleProperty.title
      );

    if (
      title.trim()
    ) {
      return title.trim();
    }
  }


  /*
  |--------------------------------------------------------------------------
  | FALLBACK
  |--------------------------------------------------------------------------
  */

  return (
    page?.url ||
    "Untitled"
  );
};


/*
|--------------------------------------------------------------------------
| SEARCH NOTION
|--------------------------------------------------------------------------
*/

const searchNotionPages =
  async ({
    accessToken,
    query,
    pageSize = 20,
  } = {}) => {
    if (
      !query?.trim()
    ) {
      return [];
    }


    const notion =
      createNotionClient(
        accessToken
      );


    const response =
      await notion.search({
        query:
          query.trim(),

        page_size:
          pageSize,
      });


    const results =
      response?.results ||
      [];


    return results
      .filter(
        (item) =>
          item?.object ===
          "page"
      )
      .map(
        (page) => ({
          id:
            page.id,

          name:
            getPageTitle(page),

          url:
            page.url ||
            null,

          lastEditedTime:
            page.last_edited_time ||
            null,

          createdTime:
            page.created_time ||
            null,

          archived:
            Boolean(
              page.archived
            ),

          object:
            page.object,

          parent:
            page.parent ||
            null,
        })
      );
  };


/*
|--------------------------------------------------------------------------
| RETRIEVE PAGE
|--------------------------------------------------------------------------
*/

const retrieveNotionPage =
  async ({
    accessToken,
    pageId,
  } = {}) => {
    if (
      !pageId
    ) {
      throw new Error(
        "Notion page ID is required."
      );
    }


    const notion =
      createNotionClient(
        accessToken
      );


    const page =
      await notion.pages.retrieve(
        {
          page_id:
            pageId,
        }
      );


    return page;
  };


/*
|--------------------------------------------------------------------------
| GET PAGE CONTENT
|--------------------------------------------------------------------------
|
| Reads the blocks inside a Notion page.
|
|--------------------------------------------------------------------------
*/

const getNotionPageContent =
  async ({
    accessToken,
    pageId,
    maxChars = 12000,
  } = {}) => {
    if (
      !pageId
    ) {
      throw new Error(
        "Notion page ID is required."
      );
    }


    const notion =
      createNotionClient(
        accessToken
      );


    const page =
      await notion.pages.retrieve(
        {
          page_id:
            pageId,
        }
      );


    const blocks =
      await listAllBlockChildren(
        notion,
        pageId
      );


    const textParts = [];


    /*
    |--------------------------------------------------------------------------
    | EXTRACT TOP-LEVEL BLOCKS
    |--------------------------------------------------------------------------
    */

    for (
      const block of blocks
    ) {
      const text =
        normalizeText(
          blockToText(block)
        );


      if (
        text
      ) {
        textParts.push(
          text
        );
      }


      /*
      |--------------------------------------------------------------------------
      | HANDLE CHILDREN
      |--------------------------------------------------------------------------
      |
      | Toggle/list/nested blocks can contain child blocks.
      |
      |--------------------------------------------------------------------------
      */

      if (
        block?.has_children
      ) {
        try {
          const children =
            await listAllBlockChildren(
              notion,
              block.id
            );


          for (
            const child of children
          ) {
            const childText =
              normalizeText(
                blockToText(
                  child
                )
              );


            if (
              childText
            ) {
              textParts.push(
                childText
              );
            }
          }
        } catch (
          childError
        ) {
          console.error(
            `Notion child block read error for ${block.id}:`,
            childError
          );
        }
      }
    }


    let content =
      textParts.join(
        "\n"
      );


    /*
    |--------------------------------------------------------------------------
    | LIMIT CONTEXT SIZE
    |--------------------------------------------------------------------------
    */

    if (
      content.length >
      maxChars
    ) {
      content =
        `${content.slice(
          0,
          maxChars
        )}\n\n[Content truncated for AI context.]`;
    }


    return {
      page: {
        id:
          page.id,

        name:
          getPageTitle(
            page
          ),

        url:
          page.url ||
          null,

        lastEditedTime:
          page.last_edited_time ||
          null,
      },

      content,
    };
  };


/*
|--------------------------------------------------------------------------
| FIND RELEVANT NOTION PAGES
|--------------------------------------------------------------------------
*/

const findRelevantNotionPages =
  async ({
    accessToken,
    query,
    maxPages = 3,
  } = {}) => {
    if (
      !query?.trim()
    ) {
      return [];
    }


    /*
    |--------------------------------------------------------------------------
    | NORMAL SEARCH
    |--------------------------------------------------------------------------
    */

    let pages =
      [];


    try {
      pages =
        await searchNotionPages({
          accessToken,
          query,
          pageSize:
            Math.max(
              maxPages * 4,
              10
            ),
        });
    } catch (
      error
    ) {
      console.error(
        "Notion search error:",
        error
      );

      return [];
    }


    /*
    |--------------------------------------------------------------------------
    | RETURN BEST MATCHES
    |--------------------------------------------------------------------------
    */

    return pages
      .filter(
        (page) =>
          !page.archived
      )
      .slice(
        0,
        maxPages
      );
  };


/*
|--------------------------------------------------------------------------
| GET RELEVANT NOTION CONTEXT
|--------------------------------------------------------------------------
|
| Search pages → read page content → prepare AI context.
|
|--------------------------------------------------------------------------
*/

const getRelevantNotionContext =
  async ({
    accessToken,
    query,
    maxPages = 3,
    maxCharsPerPage = 12000,
  } = {}) => {
    if (
      !query?.trim()
    ) {
      return {
        context:
          null,

        sources:
          [],
      };
    }


    const pages =
      await findRelevantNotionPages({
        accessToken,
        query,
        maxPages,
      });


    if (
      pages.length === 0
    ) {
      return {
        context:
          null,

        sources:
          [],
      };
    }


    const contextParts =
      [];

    const sources =
      [];


    for (
      const page of pages
    ) {
      try {
        const result =
          await getNotionPageContent({
            accessToken,

            pageId:
              page.id,

            maxChars:
              maxCharsPerPage,
          });


        if (
          result?.content
        ) {
          contextParts.push(
            [
              `SOURCE: ${result.page.name}`,
              `URL: ${result.page.url || "Not available"}`,
              "",
              result.content,
            ].join(
              "\n"
            )
          );


          sources.push({
            id:
              result.page.id,

            name:
              result.page.name,

            url:
              result.page.url ||
              null,

            lastEditedTime:
              result.page.lastEditedTime ||
              null,
          });
        }
      } catch (
        pageError
      ) {
        console.error(
          `Notion page read error for ${page.name}:`,
          pageError
        );
      }
    }


    if (
      contextParts.length === 0
    ) {
      return {
        context:
          null,

        sources:
          [],
      };
    }


    return {
      context:
        contextParts.join(
          "\n\n------------------------------\n\n"
        ),

      sources,
    };
  };


/*
|--------------------------------------------------------------------------
| GET NOTION USER TOKEN
|--------------------------------------------------------------------------
|
| Helper used later by controllers/routes.
|
|--------------------------------------------------------------------------
*/

const refreshNotionConnection =
  async ({
    refreshToken,
  } = {}) => {
    if (
      !refreshToken
    ) {
      throw new Error(
        "Notion refresh token is missing."
      );
    }


    const tokenData =
      await refreshNotionAccessToken(
        refreshToken
      );


    if (
      !tokenData?.access_token
    ) {
      throw new Error(
        "Notion did not return a refreshed access token."
      );
    }


    return {
      accessToken:
        tokenData.access_token,

      refreshToken:
        tokenData.refresh_token ||
        refreshToken,

      tokenType:
        tokenData.token_type ||
        "bearer",
    };
  };


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createNotionClient,

  normalizeText,

  richTextToPlainText,

  blockToText,

  searchNotionPages,

  retrieveNotionPage,

  getNotionPageContent,

  findRelevantNotionPages,

  getRelevantNotionContext,

  refreshNotionConnection,
};