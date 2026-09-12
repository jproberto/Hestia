"use client";

export interface MilonExampleProps {
  name: string;
}

export function MilonExample({ name }: MilonExampleProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <h3 className="text-lg font-display tracking-wider">{name}</h3>
    </div>
  );
}
