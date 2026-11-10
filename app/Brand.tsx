import Image from "next/image";

/** Logo + title block used in the header of every page. */
export default function Brand({ title = "National Alumni Register" }: { title?: string }) {
  return (
    <div className="brand">
      <Image src="/logo.png" alt="ODASCO Past Students Association, Nananom" width={76} height={76} priority />
      <div>
        <span className="eyebrow">ODASCO Past Students Association</span>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
