//Don't miss those parens at the end. This require is also a function call
import randomString from "random-string";

export const DEFAULT_ACCESS_SECRET = randomString();
export const DEFAULT_REFRESH_SECRET = randomString();
