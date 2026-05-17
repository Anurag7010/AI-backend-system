import { cn } from "@/lib/cn";

interface CardSubProps {
  className?: string;
  children: React.ReactNode;
}

function CardRoot({ className, children }: CardSubProps) {
  return <div className={cn("card", className)}>{children}</div>;
}

function CardHeader({ className, children }: CardSubProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-6 pb-4 border-b border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({ className, children }: CardSubProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold text-foreground leading-tight",
        className,
      )}
    >
      {children}
    </h3>
  );
}

function CardDescription({ className, children }: CardSubProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
  );
}

function CardContent({ className, children }: CardSubProps) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

function CardFooter({ className, children }: CardSubProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3",
        "px-6 py-4 border-t border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Attach sub-components to Card for compound component usage:
// <Card.Header><Card.Title>Title</Card.Title></Card.Header>
// Also exported individually for direct import:
// import { CardHeader } from '@/components/ui/Card'
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

/*
Usage examples:

// Compound component style:
<Card>
  <Card.Header>
    <Card.Title>Documents</Card.Title>
    <Card.Description>Manage your uploaded files</Card.Description>
  </Card.Header>
  <Card.Content>content here</Card.Content>
  <Card.Footer><Button>Save</Button></Card.Footer>
</Card>

// Direct import style:
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
</Card>
*/
