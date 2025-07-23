'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document } from '@/lib/types';
import { BookOpen, FileText, Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


function RenameDialog({ document, onDocumentRename, children }: { document: Document, onDocumentRename: (documentId: string, newName: string) => void, children: React.ReactNode }) {
    const [newName, setNewName] = useState(document.source_file);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && newName.trim() !== document.source_file) {
            onDocumentRename(document.id, newName.trim());
        }
        setIsOpen(false);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Rename Document</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the document "{document.source_file}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="new-name" className="sr-only">New Name</Label>
                        <Input 
                            id="new-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface TheoryZoneTabProps {
  documents: Document[];
  onDocumentDelete: (documentId: string) => void;
  onDocumentRename: (documentId: string, newName: string) => void;
}

export default function TheoryZoneTab({ documents, onDocumentDelete, onDocumentRename }: TheoryZoneTabProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(documents.length > 0 ? documents[0].source_file : null);

  const GLASS_CARD = 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/30 dark:border-zinc-800/40 shadow-2xl';

  const selectedContent = documents.find(c => c.source_file === selectedFile);
  
  React.useEffect(() => {
    if (documents.length > 0 && !documents.some(d => d.source_file === selectedFile)) {
      setSelectedFile(documents[0].source_file);
    } else if (documents.length === 0) {
      setSelectedFile(null);
    }
  }, [documents, selectedFile]);


  if (documents.length === 0) {
    return (
        <Card className={`${GLASS_CARD} flex flex-col items-center justify-center py-20 text-center`}> 
            <CardHeader>
                <div className="mx-auto bg-secondary p-4 rounded-full shadow-lg">
                    <BookOpen className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="mt-4 text-2xl font-bold text-primary drop-shadow">Your Theory Zone is Empty</CardTitle>
                <CardDescription className="text-base text-muted-foreground">Upload some PDFs on the Upload tab to see theory content here.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Nav bar is assumed to be above this component */}
      <div className={`${GLASS_CARD} w-full max-w-full mx-auto p-8 pb-4 rounded-b-none rounded-t-2xl shadow-xl mb-0`}> 
        <h1 className="text-3xl font-bold text-primary drop-shadow mb-1">Theory Zone</h1>
        <p className="text-lg text-muted-foreground">Browse the theory content extracted from your uploaded PDFs.</p>
      </div>
      <div className="flex flex-1 w-full max-w-full bg-gradient-to-br from-white/40 via-background/60 to-primary/10 dark:from-zinc-900/40 dark:to-background/60 rounded-b-2xl overflow-hidden">
        <ScrollArea className="w-72 min-w-[220px] max-w-xs h-full border-r bg-transparent">
          <div className="p-2">
            <h4 className="font-semibold text-sm p-2 text-primary">Source Files</h4>
            <div className="flex flex-col gap-1">
              {documents.map((content) => (
                <div key={content.id} className="flex items-center group">
                  <Button 
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left h-auto p-2 flex-grow rounded-xl transition-all duration-200 text-base font-medium",
                      selectedFile === content.source_file ? "bg-primary/10 text-primary font-bold shadow-md" : "hover:bg-primary/5 hover:text-primary"
                    )}
                    onClick={() => setSelectedFile(content.source_file)}
                  >
                    <FileText className="w-5 h-5 mr-2 shrink-0 text-primary/80" />
                    <span className="truncate">{content.source_file}</span>
                  </Button>
                  <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RenameDialog document={content} onDocumentRename={onDocumentRename}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </RenameDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the document "{content.source_file}", all of its associated questions, and any related test history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDocumentDelete(content.id)} className={buttonVariants({ variant: "destructive" })}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="flex-1 h-full overflow-auto p-8">
          <div className="rounded-2xl bg-white/60 dark:bg-zinc-900/60 shadow-inner min-h-[300px] p-6">
            {selectedContent ? (
              <ReactMarkdown
                className="prose prose-base dark:prose-invert max-w-none text-foreground"
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {selectedContent.theory || ''}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mb-4"/>
                <p>Select a file to view its theory content.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
