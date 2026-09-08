import { NextResponse } from "next/server";

import { getMembershipPlans } from "@/actions/membership.actions";

export async function GET() {
  const plans = await getMembershipPlans();

  return NextResponse.json(
    plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price: Number(plan.price),
      durationDays: plan.durationDays,
      features: plan.features,
    })),
  );
}
