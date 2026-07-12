type NotesPageProps = {
  archived?: boolean;
};

export function NotesPage({ archived = false }: NotesPageProps) {
  return (
    <section className="page notes-page" data-testid="notes-page">
      <h1>{archived ? "Archived notes" : "All notes"}</h1>
      <p>{archived ? "Archived notes will appear here." : "Your notes will appear here."}</p>
    </section>
  );
}
