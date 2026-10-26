// Minimal usage of message as a shadcn consumer writes it (inventory probe, not product code).
import {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageHeader,
  MessageContent,
  MessageFooter,
} from "../ui/message.tsx";

export default function Probe() {
  return (
    <div className="w-full h-full flex-col gap-2 p-2 bg-slate-100">
      <MessageGroup>
        <Message>
          <MessageAvatar>JG</MessageAvatar>
          <MessageHeader>Jun</MessageHeader>
          <MessageContent>Hello</MessageContent>
          <MessageFooter>10:00</MessageFooter>
        </Message>
      </MessageGroup>
    </div>
  );
}
