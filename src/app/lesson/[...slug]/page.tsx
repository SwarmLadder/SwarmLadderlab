import { Lesson } from "../../../features/notebook/Notebook";
import { catalog } from "../../catalog";
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog().levels.flatMap((l) =>
    l.sections.flatMap((s) => s.items.map((i) => ({ slug: i.id.split("/") }))),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const id = (await params).slug.join("/");
  return <Lesson key={id} id={id} catalog={catalog()} />;
}
