import React from "react";
import Image from "next/image";
import DashboardPageLayout from "@/components/dashboard/layout";
import CuteRobotIcon from "@/components/icons/cute-robot";

export default function NotFound() {
  return (
    <DashboardPageLayout
      header={{
        title: "Not found",
        description: "page under construction",
        icon: CuteRobotIcon,
      }}
    >
      <div className="flex flex-col items-center justify-center gap-10 flex-1">
        <picture className="w-1/4 aspect-square grayscale opacity-50">
          <Image
            src="/assets/healthcare_bot.jpg"
            alt="Page under construction"
            width={1000}
            height={1000}
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="size-full object-contain"
          />
        </picture>

        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-xl font-bold uppercase text-muted-foreground">
            Not found, yet
          </h1>
          <p className="text-sm max-w-sm text-center text-muted-foreground text-balance">
            This section of the PA Command Center is under development.
          </p>
        </div>
      </div>
    </DashboardPageLayout>
  );
}
