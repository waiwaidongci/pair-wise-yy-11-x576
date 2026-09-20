import type { ReactNode } from "react";

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-mask" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <h2>{props.title}</h2>
          </div>
          <button type="button" onClick={props.onClose}>
            关闭
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
