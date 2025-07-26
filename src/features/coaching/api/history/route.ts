export async function GET() {
  // Get coaching history (to be implemented)
  return Response.json({});
}

export async function POST() {
  return Response.json({ error: 'Recovery code request endpoint is deprecated. User sets their own recovery code during E2EE setup.' }, { status: 410 });
} 