'use strict';

/**
 * Expand template placeholders of the form {key} using the provided vars map.
 * Unknown placeholders are left unchanged.
 *
 * @param {string} template - The template string containing {key} placeholders.
 * @param {Object} vars - Map of placeholder names to replacement values.
 * @returns {string} The rendered string.
 */
const renderTemplate = (template, vars) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));

module.exports = {renderTemplate};
