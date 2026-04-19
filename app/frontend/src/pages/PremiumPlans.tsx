import { useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PAYPAL_CONTAINER_ID = "paypal-button-container-P-5B02189379420942WNHSA4GA";
const PAYPAL_SCRIPT_ID = "paypal-subscription-sdk";
const PAYPAL_PLAN_ID = "P-5B02189379420942WNHSA4GA";
const PAYPAL_SDK_URL =
  "https://www.paypal.com/sdk/js?client-id=AX7oDkq_QLZ5uDOs0XvyFuoz6EP6cITjxgvMnfTegQU49zZyQuhIycQIRE9AMPftMDs8dJvdXju3okBU&vault=true&intent=subscription";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: {
          shape?: string;
          color?: string;
          layout?: string;
          label?: string;
        };
        createSubscription?: (data: unknown, actions: { subscription: { create: (params: { plan_id: string }) => string } }) => string;
        onApprove?: (data: { subscriptionID?: string }) => void;
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

export default function PremiumPlans() {
  const { lang } = useI18n();
  const isZh = lang === "zh";

  useEffect(() => {
    const renderPaypalButtons = () => {
      if (!window.paypal) return;
      const target = document.getElementById(PAYPAL_CONTAINER_ID);
      if (!target) return;
      target.innerHTML = "";

      void window.paypal
        .Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: (_data, actions) => {
            return actions.subscription.create({
              plan_id: PAYPAL_PLAN_ID,
            });
          },
          onApprove: (data) => {
            const subscriptionId = data.subscriptionID || "";
            if (subscriptionId) {
              window.alert(
                isZh
                  ? `订阅成功，Subscription ID: ${subscriptionId}`
                  : `Subscription approved: ${subscriptionId}`
              );
            }
          },
        })
        .render(`#${PAYPAL_CONTAINER_ID}`);
    };

    if (window.paypal) {
      renderPaypalButtons();
      return;
    }

    const existingScript = document.getElementById(PAYPAL_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", renderPaypalButtons);
      return () => existingScript.removeEventListener("load", renderPaypalButtons);
    }

    const script = document.createElement("script");
    script.id = PAYPAL_SCRIPT_ID;
    script.src = PAYPAL_SDK_URL;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.async = true;
    script.addEventListener("load", renderPaypalButtons);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", renderPaypalButtons);
    };
  }, [isZh]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#10243a] via-[#153149] to-[#112c3c] p-6">
          <Badge className="bg-cyan-500/20 text-cyan-100 border-cyan-300/30">
            {isZh ? "订阅方案" : "Subscription Plans"}
          </Badge>
          <h1 className="text-3xl font-bold text-slate-100 mt-3">
            {isZh ? "升级 Premium，解锁 Team 协作、多项目与更高资源额度" : "Upgrade to Premium for Team Access, Multi-project Work, and Higher Limits"}
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-3xl">
            {isZh
              ? "Free 用户最多创建 1 个项目，不能删除项目，不能使用 Team，并且从 Community Artifacts 最多只能添加 2 个 packages 到 My Packages。Premium 用户可使用 Team、创建多个项目、删除项目，并拥有更高的协作与资源额度。"
              : "Free users can create up to 1 project, cannot delete projects, cannot use Team, and can add at most 2 packages from Community Artifacts into My Packages. Premium users get Team access, multi-project creation, project deletion, and higher collaboration limits."}
          </p>
        </div>

        <Card className="border-slate-700/50 bg-[#0a1528]">
          <CardHeader>
            <CardTitle className="text-slate-100">{isZh ? "功能对比" : "Feature Comparison"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-slate-700/60">
                    <th className="px-3 py-2 text-slate-300">{isZh ? "能力" : "Capability"}</th>
                    <th className="px-3 py-2 text-slate-300">Free</th>
                    <th className="px-3 py-2 text-amber-300">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "可创建项目数量" : "Project creation limit"}</td>
                    <td className="px-3 py-2 text-slate-400">1</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "无限（建议按研究主题管理）" : "Unlimited"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "删除项目" : "Delete project"}</td>
                    <td className="px-3 py-2 text-rose-300">{isZh ? "不支持" : "Not available"}</td>
                    <td className="px-3 py-2 text-emerald-300">{isZh ? "支持（需二次确认）" : "Available with confirmation"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "Team / 项目成员管理" : "Team / Project member management"}</td>
                    <td className="px-3 py-2 text-rose-300">{isZh ? "不支持" : "Not available"}</td>
                    <td className="px-3 py-2 text-emerald-300">{isZh ? "支持" : "Available"}</td>
                  </tr>
                  <tr className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{isZh ? "Community Packages 添加到 My Packages" : "Community Packages added to My Packages"}</td>
                    <td className="px-3 py-2 text-slate-400">{isZh ? "最多 2 个" : "Up to 2 packages"}</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "更多额度" : "Higher limit"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-300">{isZh ? "优先支持" : "Priority support"}</td>
                    <td className="px-3 py-2 text-slate-400">{isZh ? "标准" : "Standard"}</td>
                    <td className="px-3 py-2 text-slate-100">{isZh ? "优先响应" : "Priority"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100">PayPal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300">
                {isZh ? "点击下方按钮开通 Premium 订阅：" : "Subscribe to Premium using PayPal:"}
              </p>
              <div id={PAYPAL_CONTAINER_ID} />
              <a
                href="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-5B02189379420942WNHSA4GA"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-300 hover:text-cyan-200 underline"
              >
                {isZh ? "打不开按钮时点此支付链接" : "Fallback direct subscription link"}
              </a>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100">{isZh ? "微信支付" : "WeChat Pay"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isZh
                  ? "请添加 wenrenws 为微信好友，并备注“Premium 升级”。"
                  : "Please add wenrenws as a WeChat friend and mention \"Premium upgrade\"."}
              </p>
              <div className="mt-4 inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {isZh ? "微信联系: wenrenws" : "WeChat contact: wenrenws"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
