import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { FaArrowUp } from 'react-icons/fa';
import { Button } from './button';

type FormData = {
   prompt: string;
};

type ChatResponse = {
   message: string;
};

type Message = {
   content: string;
   role: 'user' | 'bot';
};

const ChatBot = () => {
   const [messages, setMessages] = useState<Message[]>([]);
   const [isBotTyping, setIsBotTyping] = useState(false);
   const formRef = useRef<HTMLFormElement | null>(null);
   const conversationId = useRef(crypto.randomUUID());
   const { register, handleSubmit, reset, formState } = useForm<FormData>();

   useEffect(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages]);

   const onSubmit = async ({ prompt }: FormData) => {
      setMessages((prev) => [...prev, { content: prompt, role: 'user' }]);
      setIsBotTyping(true);
      reset();

      const { data } = await axios.post<ChatResponse>('/api/chat', {
         prompt,
         conversationId: conversationId.current,
      });
      setMessages((prev) => [...prev, { content: data.message, role: 'bot' }]);
      setIsBotTyping(false);
   };

   const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSubmit(onSubmit)();
      }
   };
   // eslint-disable-next-line react-hooks/refs
   const submitHandler = handleSubmit(onSubmit);

   const onCopyMessage = (e: React.ClipboardEvent) => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) {
         e.preventDefault();
         e.clipboardData.setData('text/plain', selection);
      }
   };
   return (
      <div>
         <div className="flex flex-col gap-3 mb-10">
            {messages.map((message, index) => (
               <p
                  key={index}
                  onCopy={onCopyMessage}
                  className={`px-3 py-1 rounded-xl ${
                     message.role == 'user'
                        ? 'bg-blue-600 text-white self-end'
                        : 'bg-gray-200 text-black self-start'
                  }`}
               >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
               </p>
            ))}
            {isBotTyping && (
               <div className="flex self-start gap-1 px-3 py-3 bg-gray-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                  <div
                     className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"
                     style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                     className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"
                     style={{ animationDelay: '0.4s' }}
                  ></div>
               </div>
            )}
         </div>

         <form
            onSubmit={submitHandler}
            onKeyDown={onKeyDown}
            ref={formRef}
            className="flex flex-col gap-2 items-end border-2 p-4 rounded-3xl"
         >
            <textarea
               {...register('prompt', {
                  required: true,
                  validate: (data) => data.trim().length > 0,
               })}
               className="w-full border-0 focus:outline-0 resize-none"
               placeholder="Ask anything"
               maxLength={1000}
            />
            <Button
               disabled={!formState.isValid}
               className="rounded-full w-9 h-9"
            >
               <FaArrowUp />
            </Button>
         </form>
      </div>
   );
};

export default ChatBot;
