import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@arduino-lab/ui';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footer ? (
        <CardContent className="text-muted-foreground border-t pt-4 text-center text-sm">
          {footer}
        </CardContent>
      ) : null}
    </Card>
  );
}
