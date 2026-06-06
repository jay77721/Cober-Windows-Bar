import type { NotificationState } from "../../types/hub";
import { StatusIcon } from "../ui/StatusIcon";

type NotificationHubProps = {
  notification: NotificationState;
};

export function NotificationHub({ notification }: NotificationHubProps) {
  return (
    <div className="flex w-[300px] items-center gap-4 rounded-[22px] px-4 py-4">
      <StatusIcon type="notification" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{notification.app}</div>
        <div className="mt-1 truncate text-sm text-slate-100">
          {notification.sender}: {notification.message}
        </div>
      </div>
    </div>
  );
}
