import "@blocknote/core/fonts/inter.css";
import {
    DefaultReactSuggestionItem,
    getDefaultReactSlashMenuItems,
    SuggestionMenuController,
    useCreateBlockNote,
  } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "../editorStyles.css/";
import { Block, BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../config";

interface EditorType{
    title: string
    clear: boolean, 
    onClear: ()=> void, 
    publish: boolean, 
    onPublish: ()=> void,
}

interface uploadType{
    title: string,
    briefContent: string,
    blocknoteContent: string,
    readingTime: number
}

const Editor = ({title,clear, onClear, publish, onPublish}: EditorType) => {

    const navigate = useNavigate();
    
    const [blocks, setBlocks] = useState<Block[]>([]);
    const editor = useCreateBlockNote();
    const [customSlashMenuItems, setCustomSlashMenuItems] = useState<DefaultReactSuggestionItem[]>([]);

    let getCustomSlashMenuItems = (
        editor: BlockNoteEditor
      ): DefaultReactSuggestionItem[] => [
        ...getDefaultReactSlashMenuItems(editor)
      ];

    useEffect(()=>{

        // console.log(getCustomSlashMenuItems(editor));
        setCustomSlashMenuItems( getCustomSlashMenuItems(editor).slice(0,9) );
        // console.log(customSlashMenuItems);
              
    },[]);
    
    useEffect(()=>{
        if(clear){
            const n: number = (editor.document).length;
            const arr:string[] =[];
            for(let i:number = 0; i<n; i++){
                arr.push(editor.document[i].id)
            }
    
            editor.removeBlocks(arr);

            onClear();
        }
    },[clear]);

    function sliceString(inputString: string): string {
        if (inputString.length > 100) {
            inputString = inputString.slice(0, 100) + "...";
        }
        return inputString;
    }

    function getReadingTime(inputString: string): number{
        const words = inputString.split(" ").length;
        // console.log(words);
        const wpm = 200;
        return Math.ceil(words/wpm);
    }


    useEffect(()=>{
        async function upload(){
            if(publish){
                const markdown:string = await editor.blocksToMarkdownLossy(editor.document);
                // console.log(editor.document);
                // console.log(JSON.stringify(editor.document));
                

                let cleanedString:string = markdown.replace(/[^a-zA-Z0-9\s]/g, '');
                cleanedString = cleanedString.replace(/\s+/g, ' ').trim();

                const briefContent:string = sliceString(cleanedString);
                const readingTime:number = getReadingTime(cleanedString);

                let updatedTitle:string = title.replace(/\s+/g, ' ').trim();

                // console.log(briefContent);
                // console.log(updatedTitle);
                // console.log(readingTime);
                
                
                try{
                    // const toUpload:uploadType ={
                    //     title: title,
                    //     briefContent: briefContent,
                    //     blocknoteContent:  JSON.stringify(editor.document)
                    // }
                    // console.log(toUpload);
                    const res = await axios.post(`${BACKEND_URL}/api/v1/blog`,{
                        title: updatedTitle,
                        briefContent,
                        content: JSON.stringify(editor.document),
                        readingTime

                    },{
                        headers: {
                            Authorization: "Bearer "+localStorage.getItem("token")
                        }
                    })
                    console.log(res);
                    
                    navigate('/');
                    
                }
                catch(e){
                    console.log(e);  
                }
                
                onPublish();
            }
        }

        upload();
        
    },[publish]);


  
    

    return <BlockNoteView slashMenu={false} data-theming-css-variables editor={editor} theme={"dark"}  onChange={() => {
        setBlocks(editor.document);
      }}>
            <SuggestionMenuController
                triggerCharacter={"/"}
                getItems={async (query) => filterSuggestionItems(customSlashMenuItems, query)}
            />
        </BlockNoteView>;

}

export default Editor