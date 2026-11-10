import axios from "axios";

export async function generateDesign(
  form: FormData,
  getToken: () => Promise<string | null>
): Promise<{ image: string; prompt: string }> {
  const auth = async () => ({ Authorization: `Bearer ${await getToken()}` });

  // 1. Send the job
  const start = await axios.post<{ jobId: string }>("/api/design-start", form, {
    headers: await auth(),
    timeout: 30000,
  });
  const jobId = start.data.jobId;

  // 2. Poll every 2.5 seconds, for up to 4 minutes
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await axios.get<{ status: string; image?: string; prompt?: string; error?: string }>(
      "/api/design-status",
      { params: { id: jobId }, headers: await auth(), timeout: 30000 }
    );
    if (res.data.status === "done") return { image: res.data.image!, prompt: res.data.prompt ?? "" };
    if (res.data.status === "error") throw new Error(res.data.error || "The design could not be made.");
  }
  throw new Error("This is taking too long. Please try again.");
}