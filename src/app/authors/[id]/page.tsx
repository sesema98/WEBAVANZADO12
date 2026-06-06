import { AuthorDetailView } from "@/components/author-detail-view";

type AuthorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;

  return <AuthorDetailView authorId={id} />;
}
