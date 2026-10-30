export type SymbolCategory = "switches" | "sockets" | "outlets" | "lighting" | "other";

export type SymbolDefinition = {
  kind: import("../domain/types").SymbolKind;
  name: string;
  category: SymbolCategory;
  svg: string;
};

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#111" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const SYMBOL_CATALOG: SymbolDefinition[] = [
  {
    kind: "switch-single",
    name: "Łącznik jednobiegunowy IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/></svg>",
  },
  {
    kind: "switch-double",
    name: "Łącznik jednobiegunowy podwójny IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/></svg>",
  },
  {
    kind: "switch-double-pole",
    name: "Łącznik dwubiegunowy IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 422 L 172 193 L 85 274\"/></svg>",
  },
  {
    kind: "switch-stair",
    name: "Łącznik schodowy IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 574 L 172 803 L 85 722\"/></svg>",
  },
  {
    kind: "switch-stair-double",
    name: "Łącznik schodowy podwójny IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 203.9 754.9 L 130.7 686.7\"/></svg>",
  },
  {
    kind: "switch-cross",
    name: "Łącznik krzyżowy IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 422 L 172 193 L 85 274\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 605 574 L 834 803 L 921 722\"/></svg>",
  },
  {
    kind: "switch-cross-double",
    name: "Łącznik krzyżowy podwójny IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/><path d=\"M 401 422 L 172 193 L 85 274\"/><path d=\"M 203.9 241.1 L 130.7 309.3\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 203.9 754.9 L 130.7 686.7\"/><path d=\"M 605 574 L 834 803 L 921 722\"/><path d=\"M 802.1 754.9 L 875.3 686.7\"/></svg>",
  },
  {
    kind: "switch-push",
    name: "Przycisk zwierny IP20",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"78\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/></svg>",
  },
  {
    kind: "switch-roller",
    name: "Łącznik roletowy",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"226\" y=\"312\" width=\"571\" height=\"343\" rx=\"52\" fill=\"#b06060\" stroke=\"none\"/><path d=\"M 592 376 L 653 476 L 622 476 L 622 582 L 563 582 L 563 476 L 533 476 Z\" fill=\"#e81820\" stroke=\"#111\" stroke-width=\"12\" stroke-linejoin=\"round\"/><path d=\"M 685 392 L 744 392 L 744 500 L 775 500 L 714 598 L 654 500 L 685 500 Z\" fill=\"#20b048\" stroke=\"#111\" stroke-width=\"12\" stroke-linejoin=\"round\"/><path d=\"M1164 0 798 585H359V0H168V1409H831Q1069 1409 1198.5 1302.5Q1328 1196 1328 1006Q1328 849 1236.5 742.0Q1145 635 984 607L1384 0ZM1136 1004Q1136 1127 1052.5 1191.5Q969 1256 812 1256H359V736H820Q971 736 1053.5 806.5Q1136 877 1136 1004Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(294.84 512.23) scale(0.04855 -0.04855)\"/><path d=\"M1495 711Q1495 490 1410.5 324.0Q1326 158 1168.0 69.0Q1010 -20 795 -20Q578 -20 420.5 68.0Q263 156 180.0 322.5Q97 489 97 711Q97 1049 282.0 1239.5Q467 1430 797 1430Q1012 1430 1170.0 1344.5Q1328 1259 1411.5 1096.0Q1495 933 1495 711ZM1300 711Q1300 974 1168.5 1124.0Q1037 1274 797 1274Q555 1274 423.0 1126.0Q291 978 291 711Q291 446 424.5 290.5Q558 135 795 135Q1039 135 1169.5 285.5Q1300 436 1300 711Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(366.65 512.23) scale(0.04855 -0.04855)\"/><path d=\"M168 0V1409H359V156H1071V0Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(444.00 512.23) scale(0.04855 -0.04855)\"/></svg>",
  },
  {
    kind: "switch-single-ip44",
    name: "Łącznik jednobiegunowy IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/></svg>",
  },
  {
    kind: "switch-double-ip44",
    name: "Łącznik jednobiegunowy podwójny IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/></svg>",
  },
  {
    kind: "switch-double-pole-ip44",
    name: "Łącznik dwubiegunowy IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 422 L 172 193 L 85 274\"/></svg>",
  },
  {
    kind: "switch-stair-ip44",
    name: "Łącznik schodowy IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 574 L 172 803 L 85 722\"/></svg>",
  },
  {
    kind: "switch-stair-double-ip44",
    name: "Łącznik schodowy podwójny IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 203.9 754.9 L 130.7 686.7\"/></svg>",
  },
  {
    kind: "switch-cross-ip44",
    name: "Łącznik krzyżowy IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 401 422 L 172 193 L 85 274\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 605 574 L 834 803 L 921 722\"/></svg>",
  },
  {
    kind: "switch-cross-double-ip44",
    name: "Łącznik krzyżowy podwójny IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"76\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/><path d=\"M 605 422 L 834 193 L 921 274\"/><path d=\"M 802.1 241.1 L 875.3 309.3\"/><path d=\"M 401 422 L 172 193 L 85 274\"/><path d=\"M 203.9 241.1 L 130.7 309.3\"/><path d=\"M 401 574 L 172 803 L 85 722\"/><path d=\"M 203.9 754.9 L 130.7 686.7\"/><path d=\"M 605 574 L 834 803 L 921 722\"/><path d=\"M 802.1 754.9 L 875.3 686.7\"/></svg>",
  },
  {
    kind: "switch-push-ip44",
    name: "Przycisk zwierny IP44",
    category: "switches",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"503\" cy=\"498\" r=\"80\" fill=\"#111\" stroke=\"none\"/><circle cx=\"503\" cy=\"498\" r=\"127\"/></svg>",
  },
  {
    kind: "socket-single",
    name: "Gniazdo wtykowe IP20",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/></svg>",
  },
  {
    kind: "socket-single-ip44",
    name: "Gniazdo wtykowe IP44",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M 361 373 A 133 133 0 0 0 627 373\"/></svg>",
  },
  {
    kind: "socket-double",
    name: "Gniazdo wtykowe podwójne IP20",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 123 559 L 878 559\"/><path d=\"M 123 373 A 186 186 0 0 0 495 373\"/><path d=\"M 309 559 L 309 611\"/><path d=\"M 506 373 A 186 186 0 0 0 878 373\"/><path d=\"M 692 559 L 692 611\"/></svg>",
  },
  {
    kind: "socket-double-ip44",
    name: "Gniazdo wtykowe podwójne IP44",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 123 559 L 878 559\"/><path d=\"M 123 373 A 186 186 0 0 0 495 373\"/><path d=\"M 309 559 L 309 611\"/><path d=\"M 176 373 A 133 133 0 0 0 442 373\"/><path d=\"M 506 373 A 186 186 0 0 0 878 373\"/><path d=\"M 692 559 L 692 611\"/><path d=\"M 559 373 A 133 133 0 0 0 825 373\"/></svg>",
  },
  {
    kind: "socket-400v",
    name: "Gniazdo 400V",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M 347.1 407.7 L 312 444\"/><path d=\"M1049 389Q1049 194 925.0 87.0Q801 -20 571 -20Q357 -20 229.5 76.5Q102 173 78 362L264 379Q300 129 571 129Q707 129 784.5 196.0Q862 263 862 395Q862 510 773.5 574.5Q685 639 518 639H416V795H514Q662 795 743.5 859.5Q825 924 825 1038Q825 1151 758.5 1216.5Q692 1282 561 1282Q442 1282 368.5 1221.0Q295 1160 283 1049L102 1063Q122 1236 245.5 1333.0Q369 1430 563 1430Q775 1430 892.5 1331.5Q1010 1233 1010 1057Q1010 922 934.5 837.5Q859 753 715 723V719Q873 702 961.0 613.0Q1049 524 1049 389Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(251.35 506.09) scale(0.04552 -0.04552)\"/></svg>",
  },
  {
    kind: "socket-fridge",
    name: "Gniazdo wtykowe IP20 – lodówka",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M168 0V1409H359V156H1071V0Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(464.19 468.27) scale(0.04651 -0.04651)\"/></svg>",
  },
  {
    kind: "socket-washer",
    name: "Gniazdo wtykowe IP20 – pralka",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M1258 985Q1258 785 1127.5 667.0Q997 549 773 549H359V0H168V1409H761Q998 1409 1128.0 1298.0Q1258 1187 1258 985ZM1066 983Q1066 1256 738 1256H359V700H746Q1066 700 1066 983Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(471.29 456.82) scale(0.04587 -0.04587)\"/></svg>",
  },
  {
    kind: "socket-dryer",
    name: "Gniazdo wtykowe IP20 – suszarka",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M1272 389Q1272 194 1119.5 87.0Q967 -20 690 -20Q175 -20 93 338L278 375Q310 248 414.0 188.5Q518 129 697 129Q882 129 982.5 192.5Q1083 256 1083 379Q1083 448 1051.5 491.0Q1020 534 963.0 562.0Q906 590 827.0 609.0Q748 628 652 650Q485 687 398.5 724.0Q312 761 262.0 806.5Q212 852 185.5 913.0Q159 974 159 1053Q159 1234 297.5 1332.0Q436 1430 694 1430Q934 1430 1061.0 1356.5Q1188 1283 1239 1106L1051 1073Q1020 1185 933.0 1235.5Q846 1286 692 1286Q523 1286 434.0 1230.0Q345 1174 345 1063Q345 998 379.5 955.5Q414 913 479.0 883.5Q544 854 738 811Q803 796 867.5 780.5Q932 765 991.0 743.5Q1050 722 1101.5 693.0Q1153 664 1191.0 622.0Q1229 580 1250.5 523.0Q1272 466 1272 389Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(464.06 469.40) scale(0.04241 -0.04241)\"/></svg>",
  },
  {
    kind: "socket-dishwasher",
    name: "Gniazdo wtykowe IP20 – zmywarka",
    category: "sockets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 308 559 L 680 559\"/><path d=\"M 308 373 A 186 186 0 0 0 680 373\"/><path d=\"M 494 559 L 494 611\"/><path d=\"M1187 0H65V143L923 1253H138V1409H1140V1270L282 156H1187Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(460.87 453.91) scale(0.04813 -0.04813)\"/></svg>",
  },
  {
    kind: "socket-antenna",
    name: "Gniazdo wtyczkowe antenowe",
    category: "sockets",
    svg: svg('<path d="M14 54 V30 H50 V54"/><path d="M22 54 V38 H42 V54"/><path d="M32 30 V14"/>'),
  },
  {
    kind: "outlet-single-phase",
    name: "Wypust zasilania jednofazowy",
    category: "outlets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"286\" cy=\"508\" r=\"122\"/><path d=\"M 404 508 L 967 508\"/><path d=\"M 610 476 L 569 516\"/><path d=\"M156 0V153H515V1237L197 1010V1180L530 1409H696V153H1039V0Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(601.25 622.00) scale(0.03974 -0.03974)\"/></svg>",
  },
  {
    kind: "outlet-three-phase",
    name: "Wypust zasilania trójfazowy",
    category: "outlets",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"286\" cy=\"508\" r=\"122\"/><path d=\"M 404 508 L 967 508\"/><path d=\"M 610 476 L 569 516\"/><path d=\"M1049 389Q1049 194 925.0 87.0Q801 -20 571 -20Q357 -20 229.5 76.5Q102 173 78 362L264 379Q300 129 571 129Q707 129 784.5 196.0Q862 263 862 395Q862 510 773.5 574.5Q685 639 518 639H416V795H514Q662 795 743.5 859.5Q825 924 825 1038Q825 1151 758.5 1216.5Q692 1282 561 1282Q442 1282 368.5 1221.0Q295 1160 283 1049L102 1063Q122 1236 245.5 1333.0Q369 1430 563 1430Q775 1430 892.5 1331.5Q1010 1233 1010 1057Q1010 922 934.5 837.5Q859 753 715 723V719Q873 702 961.0 613.0Q1049 524 1049 389Z\" fill=\"#111\" stroke=\"none\" transform=\"translate(593.24 627.10) scale(0.04483 -0.04483)\"/></svg>",
  },
  {
    kind: "wall-light",
    name: "Żarówka",
    category: "lighting",
    svg: svg('<circle cx="32" cy="32" r="16"/><path d="M21 21 L43 43"/><path d="M43 21 L21 43"/>'),
  },
  {
    kind: "luminaire",
    name: "Wypust oświetleniowy",
    category: "lighting",
    svg: svg('<path d="M8 32 H36"/><path d="M32 22 L46 42"/><path d="M46 22 L32 42"/>'),
  },
  {
    kind: "ground",
    name: "Uziemienie",
    category: "other",
    svg: svg(
      '<path d="M32 10 V34"/><path d="M18 34 H46" stroke-width="3.8"/><path d="M22 41 H42" stroke-width="3.8"/><path d="M26 48 H38" stroke-width="3.8"/>',
    ),
  },
  {
    kind: "bell",
    name: "Dzwonek",
    category: "other",
    svg: svg('<path d="M16 40 A16 16 0 0 1 48 40"/><path d="M14 40 H50"/><path d="M22 40 V52"/><path d="M42 40 V52"/>'),
  },
  {
    kind: "meter",
    name: "Licznik energii",
    category: "other",
    svg: svg(
      '<rect x="18" y="12" width="28" height="40"/><path d="M18 22 H46"/><path d="M22 28 L26 38 L30 28 L34 38 L38 28 L42 38" stroke-width="3.8"/>',
    ),
  },
  {
    kind: "distribution-board",
    name: "Rozdzielnica",
    category: "other",
    svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" width=\"64\" height=\"64\" fill=\"none\" stroke=\"#111\" stroke-width=\"32\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M 142 346 L 850 346 L 850 630 Z\" fill=\"#20b048\" stroke=\"none\"/><rect x=\"142\" y=\"346\" width=\"708\" height=\"284\" fill=\"none\" stroke=\"#20b048\"/><path d=\"M 142 346 L 850 630\" stroke=\"#20b048\"/></svg>",
  },

];

export const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  switches: "Łączniki",
  sockets: "Gniazda",
  outlets: "Wypusty",
  lighting: "Oświetlenie",
  other: "Pozostałe",
};

export function symbolByKind(kind: string): SymbolDefinition | undefined {
  return SYMBOL_CATALOG.find((item) => item.kind === kind);
}

export function symbolDataUrl(def: SymbolDefinition): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(def.svg)}`;
}
