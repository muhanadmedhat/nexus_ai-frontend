import { CheckCircle2, CircleAlert, CircleDot } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DeliveryContract } from "@/services/project-handoffs";

function ContractList({
  title,
  items,
}: {
  title: string;
  items: DeliveryContract["deliverables"];
}) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-on-surface">{title}</h4>
      <ul className="mt-2 divide-y divide-outline-variant/30 border-y border-outline-variant/30">
        {items.map((item, index) => {
          const Icon =
            item.status === "met"
              ? CheckCircle2
              : ["unmet", "missing", "conflict"].includes(item.status)
                ? CircleAlert
                : CircleDot;
          return (
            <li
              key={`${title}-${index}-${item.title}`}
              className="flex items-start gap-3 py-3"
            >
              <Icon
                size={17}
                className="mt-0.5 shrink-0 text-primary-container"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-on-surface">
                    {item.title}
                  </p>
                  <StatusBadge status={item.status} />
                </div>
                {item.evidence && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-on-surface-variant">
                    {item.evidence}
                  </p>
                )}
                {(item.responsibleTasks?.length ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Responsible:{" "}
                    {item.responsibleTasks
                      ?.map(
                        (task) =>
                          `${task.taskTitle}${
                            task.roleKey
                              ? ` (${task.roleKey.replace(/_/g, " ")})`
                              : ""
                          }`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DeliveryContractView({
  contract,
}: {
  contract: DeliveryContract | null | undefined;
}) {
  if (!contract) return null;
  return (
    <section className="space-y-5">
      <div>
        <h3 className="font-semibold text-on-surface">Verified delivery contract</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          This is the agreed project scope checked against the integrated commit.
        </p>
      </div>
      <ContractList title="Chosen deliverables" items={contract.deliverables} />
      <ContractList
        title="Acceptance criteria"
        items={contract.acceptanceCriteria}
      />
      <ContractList
        title="Integration checks"
        items={contract.integrationChecks}
      />
    </section>
  );
}
