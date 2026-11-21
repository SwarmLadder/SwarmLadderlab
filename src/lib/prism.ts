// Prism's language add-ons register themselves on a global `Prism`. Prism only
// sets that global in a browser, so on the server an add-on evaluated in its own
// chunk crashed the page ("Prism is not defined"). Import Prism from here: the
// core and global come first, then every language the site highlights.
import Prism from "./prismCore";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-c.js";

export default Prism;
