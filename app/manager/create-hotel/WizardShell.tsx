"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepNav from "./components/StepNav";
import ListingPreview from "./components/ListingPreview";
import WhatsNext from "./components/WhatsNext";
import { HeadphonesIcon, ArrowRightIcon, ArrowLeftIcon } from "@/components/icons";

// Steps Imports
import Step1Basics from "./steps/Step1Basics";
import Step2Location from "./steps/Step2Location";
import Step3Photos from "./steps/Step3Photos";
import Step4Rooms from "./steps/Step4Rooms";
import Step5Amenities from "./steps/Step5Amenities";
import Step6Policies from "./steps/Step6Policies";
import Step7Pricing from "./steps/Step7Pricing";
import Step8Availability from "./steps/Step8Availability";
import Step9Review from "./steps/Step9Review";

import { UseHotelDraftReturn } from "./useHotelDraft";
import type { HotelPhoto, RoomDraft } from "@/lib/types";

interface WizardShellProps {
  draftContext: UseHotelDraftReturn;
}

export default function WizardShell({ draftContext }: WizardShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    draft,
    rooms,
    photos,
    rule,
    loading,
    saving,
    isNavigating,
    error,
    setError,
    flush,
    navigateToStep,
    reload,
  } = draftContext;

  // Initialize/sync URL query parameter "?step=" with the draft's step progress
  const urlStepStr = searchParams.get("step");
  const currentStep = urlStepStr ? parseInt(urlStepStr, 10) : null;

  useEffect(() => {
    if (!loading && draft) {
      const step = currentStep || draft.wizard_step || 1;
      // If no step in URL, set it
      if (!urlStepStr) {
        router.replace(`/manager/create-hotel?step=${step}`);
      }
    }
  }, [loading, draft, currentStep, urlStepStr, router]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
          <span className="text-sm font-medium text-slate-500">Loading your draft...</span>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-rose-600 font-bold">Failed to load property draft.</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const activeStep = currentStep || draft.wizard_step || 1;

  // Step information
  const stepsMeta = [
    { num: 1, title: "Property basics", subtitle: "Tell guests the key things about your property." },
    { num: 2, title: "Location", subtitle: "Help guests find you by adding an exact location." },
    { num: 3, title: "Photos", subtitle: "Upload high-quality photos to attract more guests." },
    { num: 4, title: "Rooms & rates", subtitle: "Add all the room types available in your property." },
    { num: 5, title: "Amenities", subtitle: "Select all amenities and facilities available at your property." },
    { num: 6, title: "Policies", subtitle: "Set your property rules and cancellation policies." },
    { num: 7, title: "Pricing & taxes", subtitle: "Set pricing, extra charges and tax configuration." },
    { num: 8, title: "Availability", subtitle: "Set availability rules and calendar booking preferences." },
    { num: 9, title: "Review & publish", subtitle: "Review all details and publish your listing." },
  ];

  const currentMeta = stepsMeta[activeStep - 1] || stepsMeta[0];

  const handleStepClick = async (stepNum: number) => {
    setError(null);
    router.push(`/manager/create-hotel?step=${stepNum}`);
    await navigateToStep(stepNum);
  };

  const handleSaveAndContinue = async () => {
    setError(null);
    // 1. Run local validation for the active step
    const validationError = validateStep(activeStep);
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 2. Save progress
    const nextStep = activeStep + 1;
    if (activeStep < 9) {
      router.push(`/manager/create-hotel?step=${nextStep}`);
      await navigateToStep(nextStep);
    } else {
      // Step 9 triggers final publish flow inside Step9Review component
    }
  };

  const handleBack = async () => {
    setError(null);
    if (activeStep > 1) {
      const prevStep = activeStep - 1;
      router.push(`/manager/create-hotel?step=${prevStep}`);
      await navigateToStep(prevStep);
    }
  };

  const handleSaveAndContinueLater = async () => {
    setError(null);
    await flush(); // Force immediate database flush
    router.push("/manager/dashboard");
  };

  // Step Validation logic before advancing
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!draft.name || draft.name.trim() === "" || draft.name === "Untitled Property") return "Property name is required.";
        if (!draft.property_type) return "Property type is required.";
        if (!draft.short_description || draft.short_description.trim() === "") return "Short description is required.";
        if (draft.short_description.length > 200) return "Short description cannot exceed 200 characters.";
        if (!draft.detailed_description || draft.detailed_description.trim() === "") return "Detailed description is required.";
        if (draft.detailed_description.replace(/<[^>]*>/g, "").length > 2000) return "Detailed description cannot exceed 2000 characters.";
        if (!draft.star_rating || draft.star_rating < 1) return "Star rating is required.";
        break;
      case 2:
        if (!draft.country) return "Country is required.";
        if (!draft.state) return "State/Province is required.";
        if (!draft.city) return "City is required.";
        if (!draft.address_line) return "Street address is required.";
        if (!draft.pincode) return "Pincode is required.";
        if (!/^\d{6}$/.test(draft.pincode)) return "Pincode must be exactly 6 digits.";
        if (draft.latitude === null || draft.longitude === null) return "Coordinates must be pin-pointed on the map.";
        break;
      case 3:
        const hasCover = photos.some((p: HotelPhoto) => p.category === "cover");
        if (!hasCover) return "Cover photo is required.";
        // Checked: either >=1 hotel photos of type 'rooms' or >=1 room attached photos
        const hasGeneralRoomPhotos = photos.some((p: HotelPhoto) => p.category === "rooms");
        if (!hasGeneralRoomPhotos && rooms.length === 0) {
          return "At least one room photo is required (add a room first in the next step or upload room view photos here).";
        }
        break;
      case 4:
        const activeRooms = rooms.filter((r: RoomDraft) => r.is_active);
        if (activeRooms.length === 0) return "At least one active room is required to continue.";
        for (const r of activeRooms) {
          if (!r.price || r.price <= 0) return `Room type '${r.name}' must have a nightly rate greater than 0.`;
          if (!r.total_units || r.total_units < 1) return `Room type '${r.name}' must specify at least 1 room unit.`;
        }
        break;
      case 6:
        if (!draft.check_in_time) return "Check-in time is required.";
        if (!draft.check_out_time) return "Check-out time is required.";
        if (!draft.cancellation_policy) return "Cancellation policy choice is required.";
        if (!draft.payment_policy) return "Payment policy choice is required.";
        if (draft.require_advance && (!draft.advance_amount || draft.advance_amount <= 0)) {
          return "Please specify a valid advance payment amount.";
        }
        break;
      case 8:
        if (rule && rule.advance_days && rule.advance_days < 0) return "Advance booking days must be a positive number.";
        break;
      default:
        break;
    }
    return null;
  };

  const renderActiveStepForm = () => {
    switch (activeStep) {
      case 1:
        return <Step1Basics draftContext={draftContext} />;
      case 2:
        return <Step2Location draftContext={draftContext} />;
      case 3:
        return <Step3Photos draftContext={draftContext} />;
      case 4:
        return <Step4Rooms draftContext={draftContext} />;
      case 5:
        return <Step5Amenities draftContext={draftContext} />;
      case 6:
        return <Step6Policies draftContext={draftContext} />;
      case 7:
        return <Step7Pricing draftContext={draftContext} />;
      case 8:
        return <Step8Availability draftContext={draftContext} />;
      case 9:
        return <Step9Review draftContext={draftContext} onStepClick={handleStepClick} />;
      default:
        return <Step1Basics draftContext={draftContext} />;
    }
  };

  // Show right rail for steps 1-4 and step 9
  const showRightRail = [1, 2, 3, 4, 9].includes(activeStep);

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Full-Page Backdrop Blur Spinner Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[4px] z-[9999] flex items-center justify-center animate-fadeIn">
          <div className="bg-white/95 p-8 rounded-3xl border border-slate-200/50 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 max-w-xs w-full mx-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />
            <div className="space-y-1">
              <span className="text-sm font-extrabold text-slate-800 block">Saving draft...</span>
              <span className="text-xs text-slate-500 block font-semibold">Uploading changes to server</span>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 font-semibold shadow-sm flex items-start gap-2 animate-fadeIn">
            <span className="shrink-0 mt-0.5 font-bold text-base">&times;</span>
            <div>{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Left rail (Progress checklist & Stepper bar) */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 text-base">Create a new hotel</h2>
                <button
                  type="button"
                  onClick={async () => {
                    await flush();
                    alert("Draft saved!");
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Save draft
                </button>
              </div>

              {/* Progress Stepper Line */}
              <div className="mb-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1.5">
                  <span>Listing progress</span>
                  <span className="text-rose-600">Step {activeStep} of 9</span>
                </div>
                <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        i < activeStep ? "bg-rose-600" : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step Navigation Rail */}
              <StepNav
                currentStep={activeStep}
                maxStepCompleted={draft.wizard_step || 1}
                onStepClick={handleStepClick}
              />
            </div>

            {/* Need Help Card */}
            <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
              <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
                <HeadphonesIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-emerald-950">Need help?</span>
                <span className="text-xs text-emerald-800 leading-normal">
                  Our support team is here to help you get your listing live.
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Center (Form content card & navigation) */}
          <div className={`${showRightRail ? "lg:col-span-7" : "lg:col-span-10"} flex flex-col gap-6 relative`}>
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {/* Form Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Step {activeStep} of 9
                  </span>
                  <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {currentMeta.title}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {currentMeta.subtitle}
                  </p>
                </div>

                {/* Top Action buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleSaveAndContinueLater}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm animate-button"
                  >
                    Save & continue later
                  </button>
                  {activeStep < 9 && (
                    <button
                      type="button"
                      onClick={handleSaveAndContinue}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-1.5 animate-button"
                    >
                      Save & continue
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Content Component */}
            <div className="min-h-[400px]">
              {renderActiveStepForm()}
            </div>

            {/* Bottom Navigation Row */}
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <button
                type="button"
                disabled={activeStep === 1}
                onClick={handleBack}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-1.5 animate-button"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back
              </button>

              {/* Debounced Autosave indicator */}
              <div className="text-xs text-slate-400 font-semibold px-3 py-1 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-1.5">
                {saving ? (
                  <>
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 bg-slate-300 rounded-full" />
                    All changes saved
                  </>
                )}
              </div>

              {activeStep < 9 ? (
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  className="rounded-lg bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm flex items-center gap-1.5 animate-button"
                >
                  Save & continue
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  Review options and publish below
                </span>
              )}
            </div>
          </div>

          {/* Column 3: Right rail (Listing preview and WhatsNext) */}
          {showRightRail && (
            <div className="lg:col-span-3 flex flex-col gap-6 lg:sticky lg:top-8">
              <ListingPreview
                draft={draft}
                photos={photos}
                onEditPhotosClick={() => handleStepClick(3)}
              />
              <WhatsNext currentStep={activeStep} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
