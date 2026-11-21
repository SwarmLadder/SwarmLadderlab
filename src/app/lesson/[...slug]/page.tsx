import { Lesson } from "../../../features/notebook/Notebook";
import { SqlLesson } from "../../../features/sql/SqlLesson";
import { NativeLesson } from "../../../features/native/NativeLesson";
import { DsaLesson } from "../../../features/dsa/DsaLesson";
import { catalog, type CourseId } from "../../catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return (["python", "sql", "git", "rust", "linux", "dsa", "c"] as CourseId[]).flatMap((course) =>
    catalog(course).levels.flatMap((l) =>
      l.sections.flatMap((s) => s.items.map((i) => ({ slug: i.id.split("/") }))),
    ),
  );
}
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const id = (await params).slug.join("/");
  if (id.startsWith("sql/")) return <SqlLesson key={id} id={id} catalog={catalog("sql")} />;
  if (id.startsWith("git/")) return <NativeLesson key={id} id={id} catalog={catalog("git")} />;
  if (id.startsWith("rust/")) return <NativeLesson key={id} id={id} catalog={catalog("rust")} />;
  if (id.startsWith("linux/")) return <NativeLesson key={id} id={id} catalog={catalog("linux")} />;
  if (id.startsWith("c/")) return <NativeLesson key={id} id={id} catalog={catalog("c")} />;
  if (id.startsWith("dsa/")) return <DsaLesson key={id} id={id} catalog={catalog("dsa")} />;
  return <Lesson key={id} id={id} catalog={catalog("python")} />;
}
