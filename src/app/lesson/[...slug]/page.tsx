import { Lesson } from "../../../features/notebook/Notebook";
import { SqlLesson } from "../../../features/sql/SqlLesson";
import { catalog } from "../../catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return [catalog("python"), catalog("sql")].flatMap((data) =>
    data.levels.flatMap((l) =>
      l.sections.flatMap((s) => s.items.map((i) => ({ slug: i.id.split("/") }))),
    ),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const id = (await params).slug.join("/");
  if (id.startsWith("sql/")) return <SqlLesson key={id} id={id} catalog={catalog("sql")} />;
  return <Lesson key={id} id={id} catalog={catalog("python")} />;
}
