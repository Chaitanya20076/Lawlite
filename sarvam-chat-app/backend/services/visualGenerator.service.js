"use strict";

function processVisualsInReply(reply) {
  if (!reply) return reply;
  // Pass through — frontend visualizer.js handles rendering
  return reply;
}

module.exports = { processVisualsInReply };