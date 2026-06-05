import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Quote, Link as LinkIcon, Image as ImageIcon, Minus, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  onInsertImage?: () => Promise<string | null>;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, onInsertImage, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline underline-offset-2 text-accent hover:text-accent/80" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg my-6 w-full" },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Comece a escrever seu artigo…",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[420px] px-4 py-4",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const Btn = ({
    onClick, active, children, title,
  }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL do link", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = async () => {
    if (onInsertImage) {
      const url = await onInsertImage();
      if (url) editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    const url = window.prompt("URL da imagem");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border">
        <Btn title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn title="Título H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Título H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <Heading3 className="h-3.5 w-3.5" />
        </Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote className="h-3.5 w-3.5" />
        </Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn title="Link" onClick={setLink} active={editor.isActive("link")}>
          <LinkIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Imagem" onClick={insertImage}>
          <ImageIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-3.5 w-3.5" />
        </Btn>
        <Btn title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-3.5 w-3.5" />
        </Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
