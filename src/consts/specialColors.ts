/**
 * Special marker symbol used to represent the `transparent` color keyword.
 * When attached to a `ColorData` object, it signals the decoration manager
 * to render the marker with a transparent background and border, while
 * still retaining the subtle editor ghost outline.
 */
export const SPECIAL_TRANSPARENT: unique symbol = Symbol('transparent');
