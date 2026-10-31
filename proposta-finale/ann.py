from PIL import Image, ImageDraw, ImageFont
B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; R='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def tag(d,x,y,n,txt,f,col):
    r=17; d.ellipse((x-r,y-r,x+r,y+r),fill=col,outline='white',width=3)
    d.text((x,y),str(n),font=f,fill='white',anchor='mm')
# ---- piano terra
im=Image.open('pt.png').convert('RGB').crop((360,80,1240,850)); d=ImageDraw.Draw(im)
f=ImageFont.truetype(B,18)
P=lambda x,z:(800+(x-10.6)*41.25-360, 500+(z-8.4)*41.25-80)
items=[(14.3,4.35,'Bancone lungo in acciaio, biker + climber'),(10.0,0.9,'Forno pizza a vista + ribalta per lo staff'),
 (12.0,2.9,'Passe del cibo con lampade calde'),(17.3,1.6,'Birra alla spina con tank in rame'),
 (12.8,7.5,'Sala: poche tavolate lunghe'),(9.6,11.4,'Lounge: cuscini Mah Jong e kilim'),
 (13.3,12.2,'Pista Saturday Night Fever'),(16.8,11.3,'Piano vicino al camino'),
 (3.4,12.0,'Ingresso: foto Buffalo Soldiers'),(2.4,14.3,'Mensole caschi, scarpe, zaini'),(5.3,15.5,'Boutique prodotti locali (idea Damonte)')]
col='#c0392b'
for i,(x,z,t) in enumerate(items,1): tag(d,*P(x,z),i,t,f,col)
im.save('pianta-terra.png'); open('pt-legend.txt','w').write('\n'.join(t for *_,t in items))
# ---- piano primo
im=Image.open('/home/user/Glamping-design-/progetto/piano-primo-anteprima.png').convert('RGB'); k=3.667
ov=Image.new('RGBA',im.size,(0,0,0,0)); o=ImageDraw.Draw(ov)
MOD=(70,130,180,90); ANT=(205,120,60,95); COM=(120,160,90,90); TER=(60,140,90,60); FAM=(180,90,140,90)
rooms=[((272,226,368,333),ANT,'A','17,55 m² · 2 letti\nantica dipinta'),((393,226,473,330),MOD,'M','14,70 m² · 2 letti\nmoderna'),
((512,226,570,333),MOD,'M','11,48 m²\n1 letto (biker solo)'),((608,226,690,330),MOD,'M','14,22 m² · 2 letti\nmoderna'),
((325,345,445,463),COM,'C','26,82 m² soggiorno comune\no camera famiglia 4 letti'),((447,365,552,440),ANT,'A','14,00 m² · 2 letti\nantica, sul terrazzo'),
((622,345,690,440),ANT,'A','14,16 m² · 2 letti\nantica, sul terrazzo'),((325,447,690,522),TER,'T','Terrazzo diviso in 3 con fioriere (idea Damonte)')]
for (x0,y0,x1,y1),c,_,_ in rooms: o.rectangle((x0*k,y0*k,x1*k,y1*k),fill=c)
im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB'); d=ImageDraw.Draw(im)
f2=ImageFont.truetype(B,46); f3=ImageFont.truetype(B,38)
for n,((x0,y0,x1,y1),c,L,t) in enumerate(rooms,1):
    cx,cy=(x0+x1)/2*k,(y0+y1)/2*k+(90 if L!='T' else 0); r=42
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill={'A':'#b5652b','M':'#3f6f9a','C':'#5d7f3c','T':'#2f7a55'}[L],outline='white',width=6)
    d.text((cx,cy),str(n),font=f2,fill='white',anchor='mm')
open('pp-legend.txt','w').write('\n'.join(t.replace('\n',' – ') for *_,t in rooms))
im=im.crop((int(250*k),int(140*k),int(780*k),int(560*k))); im=im.resize((im.size[0]//2,im.size[1]//2)); im.save('pianta-primo.png')
