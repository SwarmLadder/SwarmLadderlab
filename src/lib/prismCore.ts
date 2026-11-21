import Prism from "prismjs";

(globalThis as { Prism?: typeof Prism }).Prism = Prism;

export default Prism;
