export interface PlaceholderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface PlaceholderPageProps {
  icon: React.ReactNode;
  title: string;
  message: React.ReactNode;
  children?: React.ReactNode;
  primaryAction?: PlaceholderAction;
  secondaryAction?: PlaceholderAction;
  footer?: React.ReactNode;
}
