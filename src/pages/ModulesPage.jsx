import { BadgeDollarSign, ClipboardCheck, FileText, Landmark, Scale, UsersRound } from "lucide-react";

const modules = [
  { name: "Taxpayer Registry", priority: "Next", icon: UsersRound },
  { name: "Revenue Configuration", priority: "High", icon: Landmark },
  { name: "Obligations", priority: "High", icon: ClipboardCheck },
  { name: "Filing and Assessment", priority: "Medium", icon: FileText },
  { name: "Finance and Receipting", priority: "Medium", icon: BadgeDollarSign },
  { name: "Compliance and Collections", priority: "Later", icon: Scale },
];

export default function ModulesPage() {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Build sequence</span>
          <h1>Revenue Modules</h1>
        </div>
      </div>

      <div className="module-grid">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <article className="module-tile" key={module.name}>
              <Icon size={23} />
              <strong>{module.name}</strong>
              <span>{module.priority}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
