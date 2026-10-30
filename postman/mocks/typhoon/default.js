// Local stand-in for the SDK boundary, not a claim about provider quality.
const http=require('node:http');
let scenario='success';
let requests=0;
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
http.createServer(async(req,res)=>{
  try{
    const body=req.body||{};
    if(req.method==='POST'&&req.url==='/__control'){
      scenario=body.scenario||'success';requests=0;return send(res,200,{scenario});
    }
    if(req.method==='GET'&&req.url==='/__stats')return send(res,200,{scenario,requests});
    if(req.method!=='POST'||req.url!=='/v1/chat/completions')return send(res,501,{error:'Not modeled by this test boundary'});
    requests++;
    if(!body.model||!Array.isArray(body.messages))return send(res,400,{error:{message:'model and messages required'}});
    if(scenario==='rate_limit')return send(res,429,{error:{message:'Local test rate limit',type:'rate_limit_error'}});
    if(scenario==='timeout')await new Promise(resolve=>setTimeout(resolve,1800));
    const input=JSON.parse(body.messages.find(message=>message.role==='user').content);
    const cells=input.quests.slice(0,24).map(quest=>({quest_code:quest.quest_code,level:3}));
    send(res,200,{id:'local-completion',object:'chat.completion',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:scenario==='malformed'?'not valid json':JSON.stringify({cells})}}]});
  }catch(error){send(res,500,{error:{message:'Mock handler failed'}});}
}).listen(process.env.PORT||5093);
