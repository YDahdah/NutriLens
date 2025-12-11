/**
 * Accessibility utilities and helpers
 */

/**
 * Generate ARIA label for food item
 */
export function getFoodItemAriaLabel(foodName: string, calories: number, mealName: string): string {
  return `${foodName}, ${calories} calories, in ${mealName}`;
}

/**
 * Generate ARIA label for meal
 */
export function getMealAriaLabel(mealName: string, totalCalories: number, foodCount: number): string {
  return `${mealName} meal, ${totalCalories} calories, ${foodCount} ${foodCount === 1 ? 'item' : 'items'}`;
}

/**
 * Generate ARIA label for progress bar
 */
export function getProgressAriaLabel(label: string, current: number, max: number, unit: string = ''): string {
  const percentage = Math.round((current / max) * 100);
  return `${label}: ${current}${unit} of ${max}${unit} (${percentage}%)`;
}

/**
 * Handle keyboard navigation for lists
 */
export function handleListKeyboardNavigation(
  event: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (index: number) => void
): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (currentIndex < itemCount - 1) {
        onSelect(currentIndex + 1);
      }
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (currentIndex > 0) {
        onSelect(currentIndex - 1);
      }
      break;
    case 'Home':
      event.preventDefault();
      onSelect(0);
      break;
    case 'End':
      event.preventDefault();
      onSelect(itemCount - 1);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      onSelect(currentIndex);
      break;
  }
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus trap for modals
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

