// Escape before decorating user-controlled SQL; never put raw source into HTML.
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
   .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const token = /'(?:''|[^'])*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\/|\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|DISTINCT|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|TABLE|INDEX|VIEW|DROP|ALTER|AND|OR|NOT|NULL|IS|IN|EXISTS|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|UNION|ALL|INTERSECT|EXCEPT|COUNT|SUM|AVG|MIN|MAX|OVER|PARTITION|ROWS|RANGE|UNBOUNDED|PRECEDING|CURRENT|ROW|ASC|DESC|PRIMARY|KEY|FOREIGN|REFERENCES|CHECK|DEFAULT|UNIQUE|BEGIN|COMMIT|ROLLBACK|EXPLAIN|ANALYZE|TRUE|FALSE)\b|\b\d+(?:\.\d+)?\b/gi;

export function highlightSql(source: string): string {
  let html = "";
  let last = 0;
  for (const match of source.matchAll(token)) {
    const index = match.index ?? 0;
    html += escape(source.slice(last, index));
    const value = match[0];
    const kind = value.startsWith("--") || value.startsWith("/*") ? "comment"
      : value.startsWith("'") || value.startsWith('"') ? "string"
      : /^\d/.test(value) ? "number" : "keyword";
    html += '<span class="token ' + kind + '">' + escape(value) + "</span>";
    last = index + value.length;
  }
  return html + escape(source.slice(last));
}
