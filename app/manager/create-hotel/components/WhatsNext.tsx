"use client";

interface WhatsNextProps {
  currentStep: number;
}

export default function WhatsNext({ currentStep }: WhatsNextProps) {
  const items = [
    {
      label: "Add your location on map",
      completed: currentStep > 2,
    },
    {
      label: "Upload photos in different categories",
      completed: currentStep > 3,
    },
    {
      label: "Add rooms and set pricing",
      completed: currentStep > 4,
    },
    {
      label: "Set amenities and policies",
      completed: currentStep > 6,
    },
    {
      label: "Review and publish your listing",
      completed: currentStep > 8,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 text-sm mb-4">What&apos;s next?</h3>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                item.completed
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {item.completed && (
                <svg
                  className="h-3 w-3 fill-none stroke-current stroke-[3px]"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span
              className={`text-xs font-medium transition ${
                item.completed ? "text-slate-400 line-through" : "text-slate-700"
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
