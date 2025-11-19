/**
 * Generates a pagination range with ellipses.
 * e.g., [1, '...', 4, 5, 6, '...', 10]
 * @param currentPage The current active page (1-based)
 * @param totalPages The total number of pages
 * @param siblingCount Number of pages to show on each side of the current page
 * @returns An array of numbers or '...' strings.
 */
export const generatePaginationRange = (
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | '...')[] => {
  
  // Total page numbers to show (current + 2*siblings + first + last + 2*ellipses)
  const totalPageNumbers = siblingCount + 5;

  // --- Case 1: Total pages is less than what we want to show ---
  // We just return [1, 2, 3, 4, 5, ...]
  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // --- Calculate left and right sibling indices ---
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  // --- Check if we need to show ellipses ---
  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  // --- Case 2: No left ellipsis, but right ellipsis ---
  if (!showLeftEllipsis && showRightEllipsis) {
    let leftItemCount = 3 + 2 * siblingCount;
    let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  // --- Case 3: Left ellipsis, but no right ellipsis ---
  if (showLeftEllipsis && !showRightEllipsis) {
    let rightItemCount = 3 + 2 * siblingCount;
    let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
    return [firstPageIndex, '...', ...rightRange];
  }

  // --- Case 4: Both ellipses ---
  if (showLeftEllipsis && showRightEllipsis) {
    let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
  }
  
  // Fallback (shouldn't be reached)
  return [];
};