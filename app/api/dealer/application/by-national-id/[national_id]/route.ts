// app/api/dealer/application/by-national-id/[national_id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Row = {
  application_uid: string;
  applicant_email: string | null;
  created_by_email: string | null;
  created_at: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ national_id: string }> }
) {
  try {
    const { national_id } = await params;
    const nationalId = (national_id || "").trim();

    if (!nationalId) {
      return NextResponse.json({ error: "Missing national id" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user?.email) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const email = user.email.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("applications")
      .select("application_uid, applicant_email, created_by_email, created_at")
      .eq("national_id", nationalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.application_uid) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const owner =
      ((data.created_by_email || "").toLowerCase() ||
        (data.applicant_email || "").toLowerCase()) ?? "";

    if (owner !== email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ application_uid: data.application_uid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
