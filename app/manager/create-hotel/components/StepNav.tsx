"use client";

import { CheckIcon } from "@/components/icons";

interface StepNavProps {
  currentStep: number;
  maxStepCompleted: number;
  onStepClick: (step: number) => void;
}

const STEPS = [
  {
    num: 1,
    title: "Property basics",
    subtitle: "Add basic information about your property",
  },
  {
    num: 2,
    title: "Location",
    subtitle: "Set your property location on map",
  },
  {
    num: 3,
    title: "Photos",
    subtitle: "Upload photos in different categories",
  },
  {
    num: 4,
    title: "Rooms & rates",
    subtitle: "Add room types, capacity and pricing",
  },
  {
    num: 5,
    title: "Amenities",
    subtitle: "Select amenities available at your property",
  },
  {
    num: 6,
    title: "Policies",
    subtitle: "Set house rules and cancellation policies",
  },
  {
    num: 7,
    title: "Pricing & taxes",
    subtitle: "Set pricing, extra charges and taxes",
  },
  {
    num: 8,
    title: "Availability",
    subtitle: "Set availability and booking preferences",
  },
  {
    num: 9,
    title: "Review & publish",
    subtitle: "Review all details and publish your listing",
  },
];

export default function StepNav({
  currentStep,
  maxStepCompleted,
  onStepClick,
}: StepNavProps) {
  return (
    <nav className="flex flex-col gap-1 w-full">
      {STEPS.map((step) => {
        const isActive = step.num === currentStep;
        // Unlocked if it is <= maxStepCompleted (or if it is the next step immediately available)
        const isUnlocked = step.num <= maxStepCompleted;
        const isCompleted = step.num < currentStep && isUnlocked;

        return (
          <button
            key={step.num}
            type="button"
            disabled={!isUnlocked}
            onClick={() => onStepClick(step.num)}
            className={`flex items-start gap-3.5 p-3 rounded-xl text-left transition w-full ${
              isActive
                ? "bg-emerald-50 text-emerald-900 border border-emerald-100"
                : isUnlocked
                  ? "hover:bg-slate-50 text-slate-700 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            {/* Step Status Badge */}
            <div className="shrink-0 mt-0.5">
              {isCompleted ? (
                <div className="h-6 w-6 rounded-full bg-emerald-600 border border-emerald-600 text-white flex items-center justify-center">
                  <CheckIcon className="h-3.5 w-3.5" />
                </div>
              ) : isActive ? (
                <div className="h-6 w-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  {step.num}
                </div>
              ) : (
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold text-xs bg-white ${
                  isUnlocked
                    ? "border-emerald-600 text-emerald-700"
                    : "border-slate-300 text-slate-400"
                }`}>
                  {step.num}
                </div>
              )}
            </div>

            {/* Title / Description */}
            <div className="flex flex-col gap-0.5">
              <span className={`text-xs font-bold ${
                isActive ? "text-slate-900" : "text-slate-800"
              }`}>
                {step.title}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                {step.subtitle}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
