/**
 * Calculates a dynamic size (diameter) for a circular node so that
 * the full label text fits inside without overflow.
 * 
 * @param label The text inside the node
 * @param degreeCentrality Importance metrics of the node (between 0 and 1)
 * @returns The diameter of the node circle in pixels
 */
export function getNodeSize(label: string, degreeCentrality = 0.5): number {
  const textLen = label ? label.length : 0;
  
  // Base circle size based on centrality (ranges from 75px to 110px)
  const baseSize = 75 + (degreeCentrality * 35);
  
  // Dynamic scale factor for text length.
  // Circles are 2D, so space scales quadratically, but linear sizing per character handles overflow cleanly.
  // We add ~5px per character beyond 5 characters.
  const textAdjustment = Math.max(0, (textLen - 5) * 5);
  
  // Cap node size to prevent huge balloons, range [75, 230]
  return Math.min(230, baseSize + textAdjustment);
}
