# Rà soát thơ quẻ xăm (bản tiếng Việt)

Phạm vi: `content/_parts/que-xam-01..04.json`. Tiêu chí: ý gượng/ghép chữ cho đủ vần, sai logic hình ảnh, tối nghĩa, sáo rỗng, dễ hiểu thành điềm báo; đồng thời giảm cụm lặp giữa các bài ("thong dong" 5→2, "nhẹ nhàng" 8→4, "vững vàng" 3→1, "bình an" 3→1, "ăn lành ngủ đủ"/"ngủ đủ" 2→1, "thênh thang" 3→2).

Kiểm tra: `node content/tools/lucbat.mjs` cho từng lô → 0 lỗi, 0 cảnh báo; `node content/tools/merge.mjs && node content/validate.mjs` → 0 lỗi, 0 cảnh báo. Giữ nguyên `id`, `tieuDe`; bản EN không đổi.

Tổng: 26 bài (20 bài viết lại 2–4 câu, 6 bài sửa 1 câu để giảm lặp hoặc sửa chữ: 3, 4, 33, 48, 59, 100). Lời giải quẻ 93 thêm một câu nói rõ khói thẳng là lẽ tự nhiên, không phải điềm báo; các lời giải/lời khuyên khác vẫn khớp nên giữ nguyên.

## Quẻ 2 – Sương sớm trên cỏ

Cũ:

> Hạt sương đọng giữa cỏ non  
> Long lanh buổi sớm, vẫn còn trong veo  
> Thân ta nào khác sương treo  
> Ăn lành ngủ đủ, vui theo tháng ngày

Mới:

> Hạt sương đọng giữa cỏ non  
> Long lanh buổi sớm, nắng còn chưa lên  
> Thân như sương ấy, chớ quên  
> Ngủ sâu ăn sạch, cho bền tháng năm

Lý do: So sánh "thân ta nào khác sương treo" gượng; "ăn lành ngủ đủ" lặp với quẻ 40. Nay nói rõ: thân quý mà mong manh như sương, cần giữ gìn.

## Quẻ 3 – Mây trắng thong dong

Cũ:

> Trời xanh mây trắng bay qua  
> Chẳng mang chẳng giữ, nhẹ xa ngút ngàn  
> Lòng ai lo nghĩ muôn vàn  
> Buông như mây trắng, an nhàn thân tâm

Mới:

> Trời xanh mây trắng bay qua  
> Chẳng mang chẳng giữ, trôi xa ngút ngàn  
> Lòng ai lo nghĩ muôn vàn  
> Buông như mây trắng, an nhàn thân tâm

Lý do: Sửa nhẹ câu 2: "nhẹ xa ngút ngàn" ghép chữ, tối nghĩa → "trôi xa ngút ngàn".

## Quẻ 4 – Gió nồm đầu hạ

Cũ:

> Gió nồm thổi mát đầu hè  
> Lá non rung nhẹ, ai nghe rộn lòng  
> Tình duyên như gió thong dong  
> Đến khi đúng lúc, đợi mong chẳng hoài

Mới:

> Gió nồm thổi mát đầu hè  
> Lá non rung nhẹ, ai nghe rộn lòng  
> Tình duyên như gió ngoài song  
> Đến khi đúng lúc, đợi mong chẳng hoài

Lý do: Giảm lặp "thong dong" (5 bài): "như gió thong dong" → "như gió ngoài song" (gió ngoài cửa sổ, đến lúc tự vào).

## Quẻ 5 – Mưa xuân lất phất

Cũ:

> Mưa xuân lất phất bên thềm  
> Đất mềm thấm hạt, ngày đêm nhẹ nhàng  
> Học hành góp chút mỗi trang  
> Việc làm bền bỉ, vững vàng tháng năm

Mới:

> Mưa xuân lất phất bên thềm  
> Âm thầm thấm đất, ngày đêm nuôi mầm  
> Học hành mỗi buổi chuyên tâm  
> Việc làm đều đặn, tới tầm trổ bông

Lý do: Câu 2 chêm "nhẹ nhàng", câu 4 chêm "vững vàng" (cả hai cụm lặp nhiều). Nay hình ảnh liền mạch: mưa thấm đất nuôi mầm → học chuyên tâm → việc đều tay tới lúc trổ bông.

## Quẻ 13 – Gió bấc mùa đông

Cũ:

> Đông về gió bấc lạnh lùng  
> Nhà ai sớm liệu, ấm cùng bên nhau  
> Hè sang biết trữ trước sau  
> Chi tiêu vừa phải, cơm rau ấm lòng

Mới:

> Đông về gió bấc lạnh lùng  
> Nhà ai sớm liệu, ấm cùng bên nhau  
> Từ hè gom củi phơi rau  
> Tiêu pha vừa đủ, mai sau yên lòng

Lý do: Sai logic mùa: đang nói gió bấc mùa đông lại chuyển "Hè sang biết trữ". Nay: từ mùa hè đã gom củi phơi rau nên đông về vẫn ấm; khớp lời giải (trữ củi từ hè cho đông).

## Quẻ 19 – Trời quang mây tạnh

Cũ:

> Mưa tan trời lại quang mây  
> Bước ra hít thở vài giây an lành  
> Vừa qua mệt mỏi mong manh  
> Nghỉ thêm ít bữa, đi nhanh chưa cần

Mới:

> Trời vừa tạnh, đã quang mây  
> Giọt mưa còn đọng, lá đầy long lanh  
> Ốm qua thân vẫn mong manh  
> Nghỉ thêm ít bữa, cho lành hãy đi

Lý do: "hít thở vài giây an lành", "đi nhanh chưa cần" gượng, ngắt ý. Nay có hình ảnh giọt mưa đọng lá, thân vừa ốm còn mong manh, nghỉ cho lành hẳn rồi hãy đi.

## Quẻ 23 – Trăng khuyết lại tròn

Cũ:

> Trăng kia khuyết đó lại tròn  
> Duyên nào lỡ nhịp vẫn son sắt lòng  
> Hiểu nhau khi biết đợi mong  
> Nhường nhau đôi chút, trong vòng tay êm

Mới:

> Trăng kia khuyết mấy lại tròn  
> Duyên dù lỡ nhịp, vẫn còn đợi trông  
> Giận hờn như gió qua sông  
> Nhường nhau một bước, mặn nồng đêm trăng

Lý do: "lỡ nhịp vẫn son sắt lòng", "trong vòng tay êm" ghép cho đủ vần. Nay: duyên lỡ nhịp vẫn đợi; giận hờn như gió qua sông; nhường nhau một bước dưới trăng (khép lại hình ảnh trăng).

## Quẻ 24 – Ngôi sao dẫn lối

Cũ:

> Giữa khuya sao Bắc trong ngần  
> Người đi đêm tối, xa gần chẳng lo  
> Học hành có đích, chẳng mò  
> Việc làm có hướng, ấm no tháng ngày

Mới:

> Giữa khuya sao Bắc trong ngần  
> Soi người đi tối, xa gần biết phương  
> Học hành như kẻ lên đường  
> Biết nơi mình đến, dặm trường chẳng xa

Lý do: "Học hành có đích, chẳng mò" ép vần, thô; "ấm no" lạc chủ đề. Nay: sao Bắc soi người đi tối biết phương; học như người lên đường, biết nơi mình đến thì đường xa không ngại.

## Quẻ 25 – Gió đổi chiều

Cũ:

> Gió kia đổi hướng thất thường  
> Lúc lên lúc xuống, khó lường trước sau  
> Tiền nong chớ vội chạy mau  
> Đều tay dành dụm, cùng nhau vững vàng

Mới:

> Gió kia đổi hướng thất thường  
> Lúc lên lúc xuống, khó lường trước sau  
> Tiền nong chớ chạy theo nhau  
> Giữ đều tay góp, gió mau chẳng nề

Lý do: "Tiền nong chớ vội chạy mau" tối nghĩa; "vững vàng" lặp. Nay: đừng chạy theo đám đông khi gió đổi chiều, giữ đều tay góp thì gió mạnh cũng chẳng ngại.

## Quẻ 33 – Biển lặng sau giông

Cũ:

> Đêm qua biển động trùng khơi  
> Sáng nay sóng lặng, mặt trời lên cao  
> Buồn vui như sóng xôn xao  
> Biết buông thì thấy dạt dào bình an

Mới:

> Đêm qua biển động trùng khơi  
> Sáng nay sóng lặng, mặt trời lên cao  
> Buồn vui như sóng xôn xao  
> Thôi không níu giữ, lòng nào chẳng yên

Lý do: "dạt dào bình an" ghép nghĩa lạ (bình an không "dạt dào"); "bình an" lặp. Nay: thôi níu giữ thì lòng nào chẳng yên.

## Quẻ 37 – Cửa biển triều lên

Cũ:

> Triều lên cửa biển bao la  
> Thuyền nào sẵn lưới, thuận đà ra khơi  
> Cơ may đến lúc đúng thời  
> Ai lo chuẩn bị, tới nơi an toàn

Mới:

> Triều lên cửa biển bao la  
> Thuyền nào sẵn lưới, thuận đà ra khơi  
> Cơ may như nước đầy vơi  
> Buồm khâu lưới vá, gặp thời mà đi

Lý do: Câu cuối "tới nơi an toàn" nhạt, khẩu hiệu. Nay dùng hình ảnh nước triều đầy vơi và việc khâu buồm vá lưới sẵn sàng.

## Quẻ 42 – Dừng chân lưng núi

Cũ:

> Lưng chừng núi, gió nhẹ đưa  
> Dừng chân ngồi tạm, cho vừa sức đi  
> Đỉnh cao còn đó, lo gì  
> Lấy hơi lấy sức, bởi vì đường xa

Mới:

> Lưng chừng núi, gió nhẹ đưa  
> Dừng chân ngồi tạm, cho vừa sức đi  
> Đỉnh cao còn đó, lo gì  
> Thở sâu một nhịp, rồi đi tiếp đường

Lý do: "bởi vì đường xa" văn xuôi, "lấy hơi lấy sức" lặp ý. Nay: thở sâu một nhịp rồi đi tiếp.

## Quẻ 45 – Khúc quanh trên đèo

Cũ:

> Đèo cao uốn khúc vòng quanh  
> Tưởng đi chậm lại, hóa thành bình yên  
> Làm ăn đừng ngại đường triền  
> Đi đều, tiết kiệm, tự nhiên đủ đầy

Mới:

> Đèo cao mấy khúc vòng quanh  
> Đường xa mà chắc, bước nhanh dễ lầm  
> Làm ăn chẳng vội, âm thầm  
> Dành từng đồng nhỏ, tiền cầm chắc tay

Lý do: "Tưởng đi chậm lại, hóa thành bình yên" lủng củng; "đường triền" ép vần. Nay: đường vòng mà chắc, vội dễ lầm; làm ăn âm thầm, dành từng đồng nhỏ.

## Quẻ 48 – Cầu treo đung đưa

Cũ:

> Cầu treo gió thổi đung đưa  
> Mắt nhìn phía trước, chân vừa bước sang  
> Tay vin dây vững, nhẹ nhàng  
> Bờ kia đã tới, rộn ràng niềm vui

Mới:

> Cầu treo gió thổi đung đưa  
> Mắt nhìn phía trước, chân vừa bước sang  
> Tay vin dây chắc, khẽ khàng  
> Bờ kia đã tới, rộn ràng niềm vui

Lý do: Giảm lặp "nhẹ nhàng" (8 bài): "Tay vin dây vững, nhẹ nhàng" → "Tay vin dây chắc, khẽ khàng".

## Quẻ 52 – Mầm non trước gió

Cũ:

> Mầm non vừa nhú bên hiên  
> Gió lay mấy độ vẫn yên trên cành  
> Nghỉ ngơi cho rễ thêm lành  
> Mai này thân khỏe, lá xanh rợp trời

Mới:

> Mầm non vừa nhú bên hiên  
> Gió lay nghiêng ngả, gốc liền đất nâu  
> Ngủ ngon cho rễ bám sâu  
> Thân yên, cành lá dài lâu xanh rờn

Lý do: Sai hình ảnh: mầm vừa nhú bên hiên mà "yên trên cành", "lá xanh rợp trời" phóng đại. Nay: gốc bám đất nâu, ngủ ngon cho rễ bám sâu, lâu dần cành lá xanh rờn.

## Quẻ 59 – Vườn rau sau hè

Cũ:

> Vườn rau nho nhỏ sau hè  
> Sớm hôm tưới nước, mẹ che nắng chiều  
> Bữa cơm đạm bạc thương yêu  
> Rau xanh cơm dẻo, nhiều điều bình an

Mới:

> Vườn rau nho nhỏ sau hè  
> Sớm hôm tưới nước, mẹ che nắng chiều  
> Bữa cơm đạm bạc thương yêu  
> Rau xanh cơm dẻo, chẳng nhiều mà vui

Lý do: "nhiều điều bình an" sáo, chêm cho đủ vần. Nay: "chẳng nhiều mà vui" (đạm bạc mà đủ).

## Quẻ 64 – Cá lội ao trong

Cũ:

> Ao trong cá lội thong dong  
> Chẳng tranh sóng cả, chẳng mong biển ngoài  
> Thôi đừng ôm giữ lo hoài  
> Buông tay một chút, tháng dài nhẹ trôi

Mới:

> Ao trong mấy chú cá con  
> Chẳng tranh sóng cả, vẫn tròn cuộc chơi  
> Mong cầu bớt lại, lo vơi  
> Hôm nay sống trọn, thảnh thơi tháng ngày

Lý do: "thong dong" lặp; cá trong ao lại "buông tay" lệch hình ảnh; "tháng dài nhẹ trôi" gượng. Nay: cá nhỏ trong ao vẫn vui, bớt mong cầu thì lo vơi, sống trọn hôm nay.

## Quẻ 71 – Cò trắng giữa đồng

Cũ:

> Cò về đứng giữa đồng xa  
> Một chân thong thả, nhìn qua lúa vàng  
> Chậm thôi, lòng vẫn nhẹ nhàng  
> Thở sâu một nhịp, thênh thang khắp mình

Mới:

> Cò về đứng giữa đồng xa  
> Một chân lặng lẽ, ngắm qua lúa vàng  
> Thả lòng chẳng vội chẳng màng  
> Hít vào thở chậm, mênh mang đất trời

Lý do: Một bài dồn 3 cụm lặp ("thong thả", "nhẹ nhàng", "thênh thang"); "thênh thang khắp mình" gượng. Nay: cò lặng lẽ một chân, thả lòng, hít vào thở chậm giữa đất trời.

## Quẻ 73 – Giàn bầu leo cao

Cũ:

> Dây bầu bám ngọn giàn tre  
> Leo lên nhờ có bạn bè đỡ nâng  
> Biết ơn người đỡ lên tầng  
> Mai này quả chín, nhớ dâng người trồng

Mới:

> Dây bầu bám ngọn giàn tre  
> Leo cao nhờ có bạn bè kề bên  
> Hoa thơm quả ngọt chớ quên  
> Mai này đến lượt, mình nên đỡ người

Lý do: "Biết ơn người đỡ lên tầng" ép vần ("tầng" lạc hình ảnh giàn bầu). Nay: có bạn kề bên; hoa thơm quả ngọt chớ quên; rồi đến lượt mình đỡ người (khớp lời giải).

## Quẻ 76 – Mái nhà che mưa

Cũ:

> Mái nhà dẫu cũ vẫn che  
> Mưa ngoài hiên rộng, trong nghe ấm lòng  
> Bữa cơm ấm áp quây vòng  
> Thương nhau gìn giữ mái cong qua ngày

Mới:

> Mái nhà dẫu cũ vẫn che  
> Mưa ngoài hiên rộng, trong nghe ấm lòng  
> Mâm cơm rau luộc canh trong  
> Thương nhau, mặc gió mưa ròng ngoài sân

Lý do: "gìn giữ mái cong qua ngày" ép vần (nhà tranh/ngói cũ đâu phải "mái cong"); "ấm" lặp hai lần. Nay: mâm cơm rau luộc canh trong; thương nhau thì mặc gió mưa ngoài sân.

## Quẻ 82 – Con đường qua đồi

Cũ:

> Đường quanh qua mấy ngọn đồi  
> Đi hoài chẳng vội, đến hồi tới nơi  
> Việc làm có lúc chơi vơi  
> Giữ bền từng bước, chân trời mở ra

Mới:

> Đường quanh qua mấy ngọn đồi  
> Dốc cao chẳng ngại, nghỉ ngồi lấy hơi  
> Việc làm có lúc chơi vơi  
> Ngoái nhìn chặng cũ, đã vời vợi xa

Lý do: "Đi hoài chẳng vội, đến hồi tới nơi" thừa chữ, lặp nghĩa. Nay: dốc cao nghỉ ngồi lấy hơi; ngoái nhìn chặng cũ thấy mình đã đi xa (khớp lời khuyên).

## Quẻ 85 – Ngôi nhà từng viên gạch

Cũ:

> Ngôi nhà góp gạch từng viên  
> Chắt chiu dành dụm bạc tiền đủ chi  
> Không vay quá sức làm gì  
> Nhà êm cửa ấm mỗi khi trở về

Mới:

> Ngôi nhà góp gạch từng viên  
> Đặt tay cho chắc, tường liền mái cao  
> Bạc tiền chớ vội vay vào  
> Nhà xây vừa sức, ngọt ngào bữa cơm

Lý do: "Chắt chiu dành dụm bạc tiền đủ chi / Không vay quá sức làm gì" văn xuôi, khẩu ngữ. Nay giữ hình ảnh xây nhà: đặt tay cho chắc, chớ vội vay, nhà vừa sức thì bữa cơm ngọt ngào.

## Quẻ 92 – Tiếng chuông chiều

Cũ:

> Chuông chiều ngân tới cuối làng  
> Tiếng vang rồi lặng, nhẹ nhàng như mây  
> Giận hờn giữ mãi càng đầy  
> Buông ra một chút, cỏ cây dịu dàng

Mới:

> Chuông chiều ngân tới cuối làng  
> Vang rồi lắng lại, lang thang gió đồng  
> Giận hờn ôm mãi thành giông  
> Thả như tiếng vọng, tan không vướng gì

Lý do: "Buông ra một chút, cỏ cây dịu dàng" rời rạc; "nhẹ nhàng như mây" sáo, lặp. Nay: tiếng chuông vang rồi lắng; giận hờn ôm mãi thành giông, hãy thả như tiếng vọng tan đi.

## Quẻ 93 – Khói hương bay thẳng

Cũ:

> Khói hương bay thẳng lên trời  
> Làm ăn ngay chính, việc đời nhẹ tênh  
> Lời ngay chẳng sợ chông chênh  
> Người tin việc vững, lênh đênh chẳng còn

Mới:

> Gió im, sợi khói lên cao  
> Như người chính trực, lòng nào quanh co  
> Bán mua ngay thật chẳng lo  
> Lời nào đã hứa, giữ cho vẹn tròn

Lý do: Dễ bị hiểu là điềm báo mê tín ("khói hương bay thẳng" → "làm ăn nhẹ tênh"). Nay nói rõ khói thẳng vì gió im, và chỉ dùng làm ví von ("Như người chính trực"); nội dung chuyển hẳn sang chữ tín. Lời giải thêm câu: đó là lẽ tự nhiên, không phải điềm báo.

## Quẻ 96 – Cửa sổ đón gió

Cũ:

> Sáng ra mở cửa đón hương  
> Gió trong mát dịu, nắng vương hiên nhà  
> Thân tâm cũng thế, mở ra  
> Ra vườn dạo bước, hít hà khí trong

Mới:

> Sớm mai mở cửa song thưa  
> Gió vào mát rượi, nắng vừa lên hiên  
> Ngồi lâu trước máy triền miên  
> Đứng lên dạo bước, đất hiền dưới chân

Lý do: "Thân tâm cũng thế, mở ra / Ra vườn..." lặp chữ "ra", ghép vụng; "đón hương" mơ hồ. Nay: mở cửa song đón gió nắng; ngồi lâu trước máy thì đứng lên dạo bước (khớp lời giải về màn hình).

## Quẻ 100 – Tấm gương lau bụi

Cũ:

> Gương lâu bụi phủ lờ mờ  
> Lau đi một chút, bây giờ sáng trong  
> Mỗi ngày lau một góc lòng  
> An nhiên tự thấy, thong dong mỗi ngày

Mới:

> Gương lâu bụi phủ lờ mờ  
> Lau đi một chút, bây giờ sáng trong  
> Mỗi ngày lau một góc lòng  
> An nhiên tự đến, chẳng mong cầu gì

Lý do: Giảm lặp "thong dong" và "mỗi ngày" (câu 3 đã có "mỗi ngày"). Câu cuối → "An nhiên tự đến, chẳng mong cầu gì".
