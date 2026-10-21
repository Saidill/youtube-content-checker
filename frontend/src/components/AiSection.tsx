import { CollapsibleCard } from "./CollapsibleCard";

export function AiSection({
  icon,
  title,
  content,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
}) {
  return (
    <CollapsibleCard
      className={color}
      header={
        <>
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </>
      }
    >
      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>
    </CollapsibleCard>
  );
}
