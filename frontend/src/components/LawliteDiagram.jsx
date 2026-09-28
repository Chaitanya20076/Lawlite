import { useMemo } from "react";

import "./LawliteDiagram.css";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 78;

const HORIZONTAL_GAP = 70;
const VERTICAL_GAP = 58;

const CANVAS_PADDING = 50;

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const parsePayload = (raw) => {
  if (raw && typeof raw === "object") {
    return raw;
  }

  const text = String(raw ?? "").trim();

  if (!text) {
    throw new Error("Diagram data is empty.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Lawlite received an invalid diagram structure."
    );
  }
};

const getNodeLabelLines = (
  label,
  maxLength = 23
) => {
  const words = normalizeText(label).split(" ");

  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current
      ? `${current} ${word}`
      : word;

    if (
      candidate.length > maxLength &&
      current
    ) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
};

const calculateFlowLayout = (
  nodes,
  direction = "vertical"
) => {
  const isHorizontal =
    direction === "horizontal";

  const positionedNodes = nodes.map(
    (node, index) => {
      if (isHorizontal) {
        return {
          ...node,
          x:
            CANVAS_PADDING +
            index *
              (NODE_WIDTH + HORIZONTAL_GAP),

          y: CANVAS_PADDING,
        };
      }

      return {
        ...node,

        x: CANVAS_PADDING,

        y:
          CANVAS_PADDING +
          index *
            (NODE_HEIGHT + VERTICAL_GAP),
      };
    }
  );

  const width = isHorizontal
    ? CANVAS_PADDING * 2 +
      nodes.length *
        NODE_WIDTH +
      Math.max(
        nodes.length - 1,
        0
      ) *
        HORIZONTAL_GAP
    : CANVAS_PADDING * 2 +
      NODE_WIDTH;

  const height = isHorizontal
    ? CANVAS_PADDING * 2 +
      NODE_HEIGHT
    : CANVAS_PADDING * 2 +
      nodes.length *
        NODE_HEIGHT +
      Math.max(
        nodes.length - 1,
        0
      ) *
        VERTICAL_GAP;

  return {
    nodes: positionedNodes,
    width,
    height,
  };
};

const getDepthMap = (
  nodes,
  edges
) => {
  const depthMap = new Map();

  const incoming = new Map();

  nodes.forEach((node) => {
    incoming.set(
      String(node.id),
      []
    );
  });

  edges.forEach((edge) => {
    const target = String(
      edge.to
    );

    if (!incoming.has(target)) {
      incoming.set(target, []);
    }

    incoming
      .get(target)
      .push(
        String(edge.from)
      );
  });

  const calculateDepth = (
    nodeId,
    visiting = new Set()
  ) => {
    if (
      depthMap.has(nodeId)
    ) {
      return depthMap.get(nodeId);
    }

    if (visiting.has(nodeId)) {
      return 0;
    }

    visiting.add(nodeId);

    const parents =
      incoming.get(nodeId) || [];

    if (!parents.length) {
      depthMap.set(nodeId, 0);
      visiting.delete(nodeId);
      return 0;
    }

    const parentDepths =
      parents.map((parent) =>
        calculateDepth(
          parent,
          new Set(visiting)
        )
      );

    const depth =
      Math.max(
        ...parentDepths
      ) + 1;

    depthMap.set(
      nodeId,
      depth
    );

    return depth;
  };

  nodes.forEach((node) => {
    calculateDepth(
      String(node.id)
    );
  });

  return depthMap;
};

const calculateHierarchyLayout = (
  nodes,
  edges
) => {
  const depthMap =
    getDepthMap(
      nodes,
      edges
    );

  const levels = new Map();

  nodes.forEach((node) => {
    const depth =
      Number(
        node.level ??
          depthMap.get(
            String(node.id)
          ) ??
          0
      );

    if (!levels.has(depth)) {
      levels.set(depth, []);
    }

    levels
      .get(depth)
      .push(node);
  });

  const maxLevel =
    Math.max(
      ...Array.from(
        levels.keys()
      ),
      0
    );

  const positionedNodes = [];

  for (
    let level = 0;
    level <= maxLevel;
    level += 1
  ) {
    const levelNodes =
      levels.get(level) || [];

    levelNodes.forEach(
      (node, index) => {
        positionedNodes.push({
          ...node,

          x:
            CANVAS_PADDING +
            index *
              (NODE_WIDTH +
                HORIZONTAL_GAP),

          y:
            CANVAS_PADDING +
            level *
              (NODE_HEIGHT +
                VERTICAL_GAP),
        });
      }
    );
  }

  const widestLevel =
    Math.max(
      ...Array.from(
        levels.values()
      ).map(
        (levelNodes) =>
          levelNodes.length
      ),
      1
    );

  const width =
    CANVAS_PADDING * 2 +
    widestLevel *
      NODE_WIDTH +
    Math.max(
      widestLevel - 1,
      0
    ) *
      HORIZONTAL_GAP;

  const height =
    CANVAS_PADDING * 2 +
    (maxLevel + 1) *
      NODE_HEIGHT +
    Math.max(
      maxLevel,
      0
    ) *
      VERTICAL_GAP;

  return {
    nodes: positionedNodes,
    width,
    height,
  };
};

const calculateTimelineLayout = (
  nodes
) => {
  const positionedNodes =
    nodes.map(
      (node, index) => ({
        ...node,

        x:
          CANVAS_PADDING +
          index *
            (NODE_WIDTH +
              HORIZONTAL_GAP),

        y:
          CANVAS_PADDING +
          55,
      })
    );

  const width =
    CANVAS_PADDING * 2 +
    nodes.length *
      NODE_WIDTH +
    Math.max(
      nodes.length - 1,
      0
    ) *
      HORIZONTAL_GAP;

  const height =
    CANVAS_PADDING * 2 +
    NODE_HEIGHT +
    110;

  return {
    nodes: positionedNodes,
    width,
    height,
  };
};

const getNodeCenter = (
  node
) => ({
  x:
    node.x +
    NODE_WIDTH / 2,

  y:
    node.y +
    NODE_HEIGHT / 2,
});

const getFlowEdgePoints = (
  from,
  to,
  direction
) => {
  const fromCenter =
    getNodeCenter(from);

  const toCenter =
    getNodeCenter(to);

  if (
    direction ===
    "horizontal"
  ) {
    return {
      startX:
        from.x +
        NODE_WIDTH,

      startY:
        fromCenter.y,

      endX:
        to.x,

      endY:
        toCenter.y,
    };
  }

  return {
    startX:
      fromCenter.x,

    startY:
      from.y +
      NODE_HEIGHT,

    endX:
      toCenter.x,

    endY:
      to.y,
  };
};

const buildFlowPath = ({
  from,
  to,
  direction,
}) => {
  const {
    startX,
    startY,
    endX,
    endY,
  } = getFlowEdgePoints(
    from,
    to,
    direction
  );

  if (
    direction ===
    "horizontal"
  ) {
    const controlX =
      (startX + endX) / 2;

    return `
      M ${startX} ${startY}
      C ${controlX} ${startY},
        ${controlX} ${endY},
        ${endX} ${endY}
    `;
  }

  const controlY =
    (startY + endY) / 2;

  return `
    M ${startX} ${startY}
    C ${startX} ${controlY},
      ${endX} ${controlY},
      ${endX} ${endY}
  `;
};

const buildHierarchyPath = ({
  from,
  to,
}) => {
  const startX =
    from.x +
    NODE_WIDTH / 2;

  const startY =
    from.y +
    NODE_HEIGHT;

  const endX =
    to.x +
    NODE_WIDTH / 2;

  const endY =
    to.y;

  const midpointY =
    (startY + endY) / 2;

  return `
    M ${startX} ${startY}
    C ${startX} ${midpointY},
      ${endX} ${midpointY},
      ${endX} ${endY}
  `;
};

const buildTimelinePath = ({
  from,
  to,
}) => {
  const startX =
    from.x +
    NODE_WIDTH;

  const startY =
    from.y +
    NODE_HEIGHT / 2;

  const endX =
    to.x;

  const endY =
    to.y +
    NODE_HEIGHT / 2;

  return `
    M ${startX} ${startY}
    L ${endX} ${endY}
  `;
};

const DiagramNode = ({
  node,
  index,
}) => {
  const labelLines =
    getNodeLabelLines(
      node.label ||
        node.title ||
        "Step"
    );

  const description =
    normalizeText(
      node.description
    );

  const descriptionLines =
    getNodeLabelLines(
      description,
      34
    ).slice(
      0,
      2
    );

  return (
    <g
      className="lawlite-diagram-node"
      style={{
        "--node-delay": `${index * 0.07}s`,
      }}
    >
      <rect
        x={node.x}
        y={node.y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="14"
        className="lawlite-diagram-node-box"
      />

      <rect
        x={node.x + 1}
        y={node.y + 1}
        width="3"
        height={NODE_HEIGHT - 2}
        rx="2"
        className="lawlite-diagram-node-accent"
      />

      {labelLines.map(
        (line, lineIndex) => (
          <text
            key={`label-${lineIndex}`}
            x={
              node.x +
              NODE_WIDTH / 2
            }
            y={
              node.y +
              28 +
              lineIndex * 16
            }
            textAnchor="middle"
            className="lawlite-diagram-node-label"
          >
            {line}
          </text>
        )
      )}

      {descriptionLines.length >
        0 && (
        <text
          x={
            node.x +
            NODE_WIDTH / 2
          }
          y={
            node.y +
            51
          }
          textAnchor="middle"
          className="lawlite-diagram-node-description"
        >
          {descriptionLines[0]}
        </text>
      )}

      {descriptionLines.length >
        1 && (
        <text
          x={
            node.x +
            NODE_WIDTH / 2
          }
          y={
            node.y +
            64
          }
          textAnchor="middle"
          className="lawlite-diagram-node-description"
        >
          {descriptionLines[1]}
        </text>
      )}
    </g>
  );
};

const LawliteDiagram = ({
  raw,
}) => {
  const {
    payload,
    error,
  } = useMemo(() => {
    try {
      const parsed =
        parsePayload(raw);

      if (
        !parsed ||
        !Array.isArray(
          parsed.nodes
        ) ||
        parsed.nodes.length === 0
      ) {
        throw new Error(
          "A diagram needs at least one node."
        );
      }

      return {
        payload: parsed,
        error: null,
      };
    } catch (parseError) {
      return {
        payload: null,
        error:
          parseError?.message ||
          "Invalid diagram.",
      };
    }
  }, [raw]);

  if (error) {
    return (
      <div className="lawlite-diagram-error">
        <strong>
          Diagram unavailable
        </strong>

        <span>
          {error}
        </span>
      </div>
    );
  }

  const type =
    String(
      payload?.type ||
        "flow"
    ).toLowerCase();

  const direction =
    String(
      payload?.direction ||
        "vertical"
    ).toLowerCase();

  const nodes =
    payload.nodes.map(
      (node, index) => ({
        ...node,

        id:
          String(
            node.id ??
              index + 1
          ),

        label:
          normalizeText(
            node.label ||
              node.title ||
              `Step ${index + 1}`
          ),
      })
    );

  const edges = Array.isArray(
    payload.edges
  )
    ? payload.edges
        .map((edge) => ({
          from: String(
            edge.from
          ),
          to: String(
            edge.to
          ),
        }))
        .filter(
          (edge) =>
            edge.from &&
            edge.to
        )
    : [];

  const layout =
    type === "hierarchy"
      ? calculateHierarchyLayout(
          nodes,
          edges
        )
      : type === "timeline"
        ? calculateTimelineLayout(
            nodes
          )
        : calculateFlowLayout(
            nodes,
            direction
          );

  const nodeMap =
    new Map(
      layout.nodes.map(
        (node) => [
          String(node.id),
          node,
        ]
      )
    );

  const validEdges =
    edges.filter(
      (edge) =>
        nodeMap.has(edge.from) &&
        nodeMap.has(edge.to)
    );

  const timelineEdges =
    type === "timeline" &&
    validEdges.length === 0
      ? layout.nodes
          .slice(
            0,
            -1
          )
          .map(
            (node, index) => ({
              from: String(
                node.id
              ),
              to: String(
                layout.nodes[
                  index + 1
                ].id
              ),
            })
          )
      : validEdges;

  const renderedEdges =
    type === "timeline"
      ? timelineEdges
      : validEdges;

  const title =
    normalizeText(
      payload.title
    );

  return (
    <div className="lawlite-diagram">
      <div className="lawlite-diagram-header">
        <div>
          <span className="lawlite-diagram-eyebrow">
            LAWLITE VISUAL
          </span>

          <strong>
            {title ||
              type
                .replace(
                  /-/g,
                  " "
                )
                .replace(
                  /^\w/,
                  (char) =>
                    char.toUpperCase()
                )}
          </strong>
        </div>
      </div>

      <div className="lawlite-diagram-scroll">
        <svg
          className="lawlite-diagram-svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={
            title ||
            "Lawlite legal diagram"
          }
        >
          <defs>
            <marker
              id={`lawlite-arrow-${title || type}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className="lawlite-diagram-arrow"
              />
            </marker>
          </defs>

          <g>
            {renderedEdges.map(
              (
                edge,
                index
              ) => {
                const from =
                  nodeMap.get(
                    edge.from
                  );

                const to =
                  nodeMap.get(
                    edge.to
                  );

                if (!from || !to) {
                  return null;
                }

                let path;

                if (
                  type ===
                  "hierarchy"
                ) {
                  path =
                    buildHierarchyPath(
                      {
                        from,
                        to,
                      }
                    );
                } else if (
                  type ===
                  "timeline"
                ) {
                  path =
                    buildTimelinePath(
                      {
                        from,
                        to,
                      }
                    );
                } else {
                  path =
                    buildFlowPath(
                      {
                        from,
                        to,
                        direction,
                      }
                    );
                }

                return (
                  <path
                    key={`${edge.from}-${edge.to}-${index}`}
                    d={path}
                    pathLength="1"
                    className="lawlite-diagram-edge"
                    style={{
                      "--edge-delay": `${
                        index * 0.12
                      }s`,
                    }}
                    markerEnd={`url(#lawlite-arrow-${title || type})`}
                  />
                );
              }
            )}
          </g>

          <g>
            {layout.nodes.map(
              (
                node,
                index
              ) => (
                <DiagramNode
                  key={
                    String(
                      node.id
                    )
                  }
                  node={node}
                  index={index}
                />
              )
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default LawliteDiagram;