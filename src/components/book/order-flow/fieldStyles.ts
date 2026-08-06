/** Border/background fragment for inputs that can carry a validation error. */
export function errorBorderClass(hasError: boolean): string {
  return hasError ? 'border-red-300 bg-red-50/50' : 'border-gray-100';
}
