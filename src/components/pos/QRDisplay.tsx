import { QRCodeSVG } from 'qrcode.react';

interface Props {
  data: string;
  label: string;
  amount?: number;
  reference?: string;
}

const QRDisplay = ({ data, label, amount, reference }: Props) => (
  <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-xl border border-border">
    <h3 className="text-lg font-bold text-foreground">{label}</h3>
    <div className="p-4 bg-foreground rounded-xl">
      <QRCodeSVG value={data} size={220} bgColor="#ffffff" fgColor="#000000" level="M" />
    </div>
    {amount !== undefined && (
      <p className="text-2xl font-bold text-accent">Rs. {amount}</p>
    )}
    {reference && (
      <p className="text-xs text-muted-foreground font-mono">{reference}</p>
    )}
    <p className="text-sm text-muted-foreground text-center">
      Scan with your app to pay
    </p>
  </div>
);

export default QRDisplay;
