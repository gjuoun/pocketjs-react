// Fixture: className built at runtime by cn (clsx + tailwind-merge) and clsx, next to static
// reference swatches drawn from full literals. Tests compare the two in the framebuffer.
import { useState } from "react";
import { clsx } from "clsx";
import { cn, Text, View } from "pocketjs-react";

/** 200 complete width tokens: each one appears in source, so each combination is legal. */
const WIDTHS = [
  "w-[1px]", "w-[2px]", "w-[3px]", "w-[4px]", "w-[5px]", "w-[6px]", "w-[7px]", "w-[8px]", "w-[9px]", "w-[10px]",
  "w-[11px]", "w-[12px]", "w-[13px]", "w-[14px]", "w-[15px]", "w-[16px]", "w-[17px]", "w-[18px]", "w-[19px]", "w-[20px]",
  "w-[21px]", "w-[22px]", "w-[23px]", "w-[24px]", "w-[25px]", "w-[26px]", "w-[27px]", "w-[28px]", "w-[29px]", "w-[30px]",
  "w-[31px]", "w-[32px]", "w-[33px]", "w-[34px]", "w-[35px]", "w-[36px]", "w-[37px]", "w-[38px]", "w-[39px]", "w-[40px]",
  "w-[41px]", "w-[42px]", "w-[43px]", "w-[44px]", "w-[45px]", "w-[46px]", "w-[47px]", "w-[48px]", "w-[49px]", "w-[50px]",
  "w-[51px]", "w-[52px]", "w-[53px]", "w-[54px]", "w-[55px]", "w-[56px]", "w-[57px]", "w-[58px]", "w-[59px]", "w-[60px]",
  "w-[61px]", "w-[62px]", "w-[63px]", "w-[64px]", "w-[65px]", "w-[66px]", "w-[67px]", "w-[68px]", "w-[69px]", "w-[70px]",
  "w-[71px]", "w-[72px]", "w-[73px]", "w-[74px]", "w-[75px]", "w-[76px]", "w-[77px]", "w-[78px]", "w-[79px]", "w-[80px]",
  "w-[81px]", "w-[82px]", "w-[83px]", "w-[84px]", "w-[85px]", "w-[86px]", "w-[87px]", "w-[88px]", "w-[89px]", "w-[90px]",
  "w-[91px]", "w-[92px]", "w-[93px]", "w-[94px]", "w-[95px]", "w-[96px]", "w-[97px]", "w-[98px]", "w-[99px]", "w-[100px]",
  "w-[101px]", "w-[102px]", "w-[103px]", "w-[104px]", "w-[105px]", "w-[106px]", "w-[107px]", "w-[108px]", "w-[109px]", "w-[110px]",
  "w-[111px]", "w-[112px]", "w-[113px]", "w-[114px]", "w-[115px]", "w-[116px]", "w-[117px]", "w-[118px]", "w-[119px]", "w-[120px]",
  "w-[121px]", "w-[122px]", "w-[123px]", "w-[124px]", "w-[125px]", "w-[126px]", "w-[127px]", "w-[128px]", "w-[129px]", "w-[130px]",
  "w-[131px]", "w-[132px]", "w-[133px]", "w-[134px]", "w-[135px]", "w-[136px]", "w-[137px]", "w-[138px]", "w-[139px]", "w-[140px]",
  "w-[141px]", "w-[142px]", "w-[143px]", "w-[144px]", "w-[145px]", "w-[146px]", "w-[147px]", "w-[148px]", "w-[149px]", "w-[150px]",
  "w-[151px]", "w-[152px]", "w-[153px]", "w-[154px]", "w-[155px]", "w-[156px]", "w-[157px]", "w-[158px]", "w-[159px]", "w-[160px]",
  "w-[161px]", "w-[162px]", "w-[163px]", "w-[164px]", "w-[165px]", "w-[166px]", "w-[167px]", "w-[168px]", "w-[169px]", "w-[170px]",
  "w-[171px]", "w-[172px]", "w-[173px]", "w-[174px]", "w-[175px]", "w-[176px]", "w-[177px]", "w-[178px]", "w-[179px]", "w-[180px]",
  "w-[181px]", "w-[182px]", "w-[183px]", "w-[184px]", "w-[185px]", "w-[186px]", "w-[187px]", "w-[188px]", "w-[189px]", "w-[190px]",
  "w-[191px]", "w-[192px]", "w-[193px]", "w-[194px]", "w-[195px]", "w-[196px]", "w-[197px]", "w-[198px]", "w-[199px]", "w-[200px]",
];

function Swatch(props: { className: string; label: string; ground?: string }) {
  return (
    <View className={props.ground ?? "flex-row items-center gap-2"}>
      <View className={props.className} />
      <Text className="text-xs text-white">{props.label}</Text>
    </View>
  );
}

function Row(props: { label: string; disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <View
      className={cn("flex-row items-center justify-between px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600 transition-colors duration-150", on && "px-6 bg-emerald-700")}
      focusable
      onPress={() => setOn((v) => !v)}
    >
      <Text className={cn("text-sm text-white", on && "font-bold")}>{props.label}</Text>
      <View className={clsx("w-[30px] h-[10px]", on && "bg-blue-600", { "opacity-50": props.disabled })} />
    </View>
  );
}

function Stress() {
  const [many, setMany] = useState(false);
  return (
    <View className="flex-col gap-1">
      <View className="flex-row px-3 py-1 rounded-lg bg-slate-800 focus:bg-blue-600" focusable onPress={() => setMany(true)}>
        <Text className="text-sm text-white">Stress</Text>
      </View>
      <View className="flex-row flex-wrap">
        {many ? WIDTHS.map((w) => <View key={w} className={cn("h-[1px] bg-sky-400", w)} />) : null}
      </View>
    </View>
  );
}

export function App() {
  return (
    <View className="w-full h-full flex-col gap-1 p-2 bg-slate-900">
      <View className="flex-row gap-4">
        <Swatch className="w-[30px] h-[10px] bg-emerald-700" label="emerald" />
        <Swatch className="w-[30px] h-[10px] bg-blue-600" label="blue" />
        <Swatch className="w-[30px] h-[10px] bg-blue-600 opacity-50" label="dim" ground="flex-row items-center gap-2 bg-emerald-700" />
      </View>
      <Row label="Alpha" />
      <Row label="Bravo" disabled />
      <Stress />
    </View>
  );
}
