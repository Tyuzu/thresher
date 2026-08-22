// Limit array nesting depth instead of fully recursive arrays
export type RawContentInput =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<Node | string | number | boolean | null | undefined>
  | Array<Array<Node | string | number | boolean | null | undefined>>;

/**
 * Normalizes mixed inputs into a flat array of valid DOM Nodes.
 */
const normalizeContent = (content: RawContentInput): Node[] => {
  if (content == null || content === false) return [];

  const rawArray = Array.isArray(content) ? content : [content];

  // Cast .flat() depth to avoid infinite type recursion
  return (rawArray as Array<unknown>)
    .flat(10)
    .filter((item): item is NonNullable<unknown> => Boolean(item) && item !== false)
    .map((item) => (item instanceof Node ? item : document.createTextNode(String(item))));
};